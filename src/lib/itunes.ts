import {
  getItunesMapping,
  cacheItunesMapping,
  deleteItunesMapping,
} from "./cache";
import {
  albumsCompatible,
  MIN_RESOLUTION_SCORE,
  pickBestRecording,
  scoreMbRecording,
  verifyMbidMatchesContext,
} from "./mapping-quality";
import { searchRecordings } from "./musicbrainz";

export interface ITunesSong {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  artworkUrl100: string;
  trackTimeMillis: number;
  previewUrl: string;
  artistId?: number;
  collectionId?: number;
}

/** iTunes result with a verified MusicBrainz mapping — safe to link in search UI */
export type BrowsableITunesSong = ITunesSong & { mbid: string };

const DERIVATIVE_RE =
  /\b(remix|mix|edit|version|cover|tribute|karaoke|instrumental|lullaby|workout|acoustic|piano|string quartet|slowed|reverb|sped up|nightcore|8d|live|demo|bootleg|mashup|vip|feat\.?|featuring|ft\.?)\b/i;

const COMPILATION_ALBUM_RE =
  /completely different|workout|lullaby|tribute|karaoke|new sounds|new music|hot girl|fun run|best of|greatest hits|playlist|mix$/i;

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function baseTitle(trackName: string): string {
  return trackName
    .replace(/\s*[\(\[].*?[\)\]]/g, "")
    .replace(/\s*[-–—].*$/, "")
    .replace(/\s+(feat\.?|featuring|ft\.?).*$/i, "")
    .trim();
}

/** Title used for MusicBrainz Lucene search (parentheticals / feat. stripped). */
export function itunesResolveQueryTitle(title: string): string {
  return (
    baseTitle(title) ||
    title
      .replace(
        /\s*[\(\[](remaster|remastered|deluxe|live|radio edit|single edit|version|edit|remix)[\)\]]/gi,
        ""
      )
      .trim()
  );
}

function isDerivativeTrack(song: Pick<ITunesSong, "trackName" | "collectionName" | "artistName">): boolean {
  const text = `${song.trackName} ${song.collectionName ?? ""}`;
  if (DERIVATIVE_RE.test(text)) return true;
  if (COMPILATION_ALBUM_RE.test(song.collectionName ?? "")) return true;
  // Multi-artist credits usually mean a remix/collab packaging of the original
  if (/[,&]/.test(song.artistName)) return true;
  return false;
}

/** Studio original: clean title, solo primary artist, non-compilation album */
function isStudioOriginal(song: ITunesSong, targetBaseNorm: string): boolean {
  if (isDerivativeTrack(song)) return false;
  const base = normalizeTitle(baseTitle(song.trackName));
  if (base !== targetBaseNorm) return false;
  if (normalizeTitle(song.trackName) !== targetBaseNorm) return false;
  return true;
}

function primaryArtist(artistName: string): string {
  return artistName.split(/,|&| feat\.?| featuring| ft\.?/i)[0].trim();
}

function scoreSong(
  song: ITunesSong,
  query: string,
  preferredArtists: Set<string> = new Set()
): number {
  let score = 0;
  const q = query.toLowerCase().trim();
  const qNorm = normalizeTitle(query);
  const titleNorm = normalizeTitle(song.trackName);
  const baseNorm = normalizeTitle(baseTitle(song.trackName));
  const collection = (song.collectionName ?? "").toLowerCase();
  const artistPrimary = primaryArtist(song.artistName).toLowerCase();

  // Exact / near-exact title match
  if (titleNorm === qNorm) score += 50;
  else if (baseNorm === qNorm) score += 40;
  else if (titleNorm.includes(qNorm) || qNorm.includes(baseNorm)) score += 20;

  // Query contains artist + title fragments
  if (q.includes(artistPrimary) && artistPrimary.length > 2) score += 25;

  // Prefer artists that owned the remix hits we recovered from (Charli over random covers)
  if (preferredArtists.has(normalizeTitle(artistPrimary))) score += 45;

  // Prefer solo primary artist credits over multi-artist remix credits
  if (!/[,&]/.test(song.artistName) && !/\bfeat\.?\b|\bft\.?\b/i.test(song.artistName)) {
    score += 8;
  }

  // Heavy demotion of derivatives
  if (isDerivativeTrack(song)) score -= 60;
  if (/workout|lullaby|tribute|karaoke|piano|string quartet/i.test(blob(song))) score -= 40;
  if (COMPILATION_ALBUM_RE.test(collection)) score -= 35;

  // Studio album preference
  if (!/single|ep$/i.test(collection) && !isDerivativeTrack(song)) score += 12;

  // Prefer shorter, cleaner titles when base matches
  if (baseNorm === qNorm && song.trackName.length < 40) score += 5;

  if (song.previewUrl) score += 1;

  return score;
}

function blob(song: Pick<ITunesSong, "trackName" | "collectionName" | "artistName">): string {
  return `${song.trackName} ${song.collectionName ?? ""} ${song.artistName}`;
}

interface RawITunesTrack {
  wrapperType?: string;
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  artworkUrl100: string;
  trackTimeMillis: number;
  previewUrl: string;
  artistId?: number;
  collectionId?: number;
}

interface RawITunesCollection {
  wrapperType?: string;
  collectionId: number;
  collectionName?: string;
  trackCount?: number;
}

function mapItunesResult(song: RawITunesTrack): ITunesSong {
  return {
    trackId: song.trackId,
    trackName: song.trackName,
    artistName: song.artistName,
    collectionName: song.collectionName,
    artworkUrl100: song.artworkUrl100,
    trackTimeMillis: song.trackTimeMillis,
    previewUrl: song.previewUrl,
    artistId: song.artistId,
    collectionId: song.collectionId,
  };
}

/**
 * When iTunes ranks remixes above the studio original (Von dutch problem),
 * recover the canonical album track via artist → album → track lookup.
 */
async function recoverCanonicalTracks(
  query: string,
  results: ITunesSong[]
): Promise<ITunesSong[]> {
  const qNorm = normalizeTitle(query);
  if (!qNorm || results.length === 0) return [];

  // Find derivative hits whose base title matches the query (or query contains that base)
  const derivativeHits = results.filter((song) => {
    if (!isDerivativeTrack(song)) return false;
    const base = normalizeTitle(baseTitle(song.trackName));
    return base.length >= 4 && (base === qNorm || qNorm.includes(base) || base.includes(qNorm));
  });

  if (derivativeHits.length === 0) return [];

  const targetBases = [
    ...new Set(derivativeHits.map((d) => normalizeTitle(baseTitle(d.trackName)))),
  ];

  // Prefer recovering for the base that best matches the user query
  targetBases.sort((a, b) => {
    const aScore = a === qNorm ? 2 : qNorm.includes(a) ? 1 : 0;
    const bScore = b === qNorm ? 2 : qNorm.includes(b) ? 1 : 0;
    return bScore - aScore;
  });

  const primaryBase = targetBases[0];
  const seed =
    derivativeHits.find(
      (d) =>
        normalizeTitle(baseTitle(d.trackName)) === primaryBase &&
        !!d.artistId &&
        !/workout|lullaby|tribute/i.test(d.artistName)
    ) || derivativeHits.find((d) => !!d.artistId);

  if (!seed?.artistId) return [];

  // If a true studio original already exists for that artist+base, skip recovery
  const hasStudioOriginal = results.some(
    (song) =>
      isStudioOriginal(song, primaryBase) &&
      primaryArtist(song.artistName).toLowerCase() ===
        primaryArtist(seed.artistName).toLowerCase()
  );
  if (hasStudioOriginal) return [];

  const artistId = seed.artistId;

  try {
    const albumsRes = await fetch(
      `https://itunes.apple.com/lookup?id=${artistId}&entity=album&limit=20`,
      { signal: AbortSignal.timeout(2500) }
    );
    if (!albumsRes.ok) return [];
    const albumsData = await albumsRes.json();
    const albums = ((albumsData.results || []) as RawITunesCollection[]).filter(
      (r) => r.wrapperType === "collection"
    );

    // Prefer studio LPs over remix albums / singles / EPs
    const rankedAlbums = albums
      .map((a) => {
        const name = (a.collectionName || "").toLowerCase();
        let s = 0;
        if (/completely different|remix|workout|lullaby|tribute|karaoke|b-sides/i.test(name)) {
          s -= 50;
        }
        if (/single/i.test(name)) s -= 30;
        if (/\bep\b/i.test(name)) s -= 15;
        // Prefer fuller albums (trackCount available on lookup)
        const trackCount = a.trackCount || 0;
        if (trackCount >= 10) s += 20;
        else if (trackCount >= 7) s += 10;
        if ((a.collectionName || "").length <= 20) s += 5;
        return { album: a, score: s };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    const recovered: ITunesSong[] = [];
    const seen = new Set<number>();

    for (const { album } of rankedAlbums) {
      const tracksRes = await fetch(
        `https://itunes.apple.com/lookup?id=${album.collectionId}&entity=song`,
        { signal: AbortSignal.timeout(2500) }
      );
      if (!tracksRes.ok) continue;
      const tracksData = await tracksRes.json();
      for (const t of (tracksData.results || []) as RawITunesTrack[]) {
        if (t.wrapperType !== "track") continue;
        const mapped = mapItunesResult(t);
        if (!isStudioOriginal(mapped, primaryBase)) continue;
        if (seen.has(mapped.trackId)) continue;
        seen.add(mapped.trackId);
        recovered.push(mapped);
      }
      if (recovered.length > 0) break; // first good album is enough
    }

    return recovered;
  } catch (err) {
    console.error("Canonical iTunes recovery failed:", err);
    return [];
  }
}

export async function searchITunesSongs(
  query: string,
  limit = 20
): Promise<ITunesSong[]> {
  try {
    const encoded = encodeURIComponent(query);
    // Over-fetch so ranking + recovery still leave a full page of results
    const url = `https://itunes.apple.com/search?term=${encoded}&entity=song&limit=${Math.min(limit * 3, 100)}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`iTunes Search API error: ${res.status}`);
    }
    const data = await res.json();
    let results: ITunesSong[] = ((data.results || []) as RawITunesTrack[]).map(mapItunesResult);

    const preferredArtists = new Set(
      results
        .filter((r) => isDerivativeTrack(r))
        .map((r) => normalizeTitle(primaryArtist(r.artistName)))
        .filter((a) => a.length > 2)
    );

    // Recover studio originals buried under remix ranking (e.g. Von dutch)
    const recovered = await recoverCanonicalTracks(query, results);
    if (recovered.length > 0) {
      const existingIds = new Set(results.map((r) => r.trackId));
      for (const r of recovered) {
        preferredArtists.add(normalizeTitle(primaryArtist(r.artistName)));
      }
      results = [
        ...recovered.filter((r) => !existingIds.has(r.trackId)),
        ...results,
      ];
    }

    results.sort(
      (a, b) => scoreSong(b, query, preferredArtists) - scoreSong(a, query, preferredArtists)
    );

    // Deduplicate near-identical title+artist, keep highest-scored
    const seen = new Set<string>();
    const deduped: ITunesSong[] = [];
    for (const song of results) {
      const key = `${normalizeTitle(primaryArtist(song.artistName))}:${normalizeTitle(baseTitle(song.trackName))}:${isDerivativeTrack(song) ? "d" : "c"}`;
      // Allow one canonical + one derivative max per base title
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(song);
      if (deduped.length >= limit) break;
    }

    return deduped;
  } catch (err) {
    console.error("iTunes Search failed:", err);
    return [];
  }
}

async function acceptCachedMapping(
  existing: NonNullable<Awaited<ReturnType<typeof getItunesMapping>>>,
  artist: string,
  title: string,
  album?: string,
  durationMs?: number
): Promise<string | null> {
  const albumMismatch =
    album && existing.albumTitle && !albumsCompatible(album, existing.albumTitle);
  const needsLegacyCheck = album && !existing.albumTitle;

  if (albumMismatch) {
    await deleteItunesMapping(existing.itunesTrackId);
    return null;
  }

  if (needsLegacyCheck) {
    const verified = await verifyMbidMatchesContext(
      existing.mbid,
      artist,
      title,
      album,
      durationMs
    );
    if (!verified.ok) {
      await deleteItunesMapping(existing.itunesTrackId);
      return null;
    }
    await cacheItunesMapping({ ...existing, albumTitle: album ?? null });
  }

  return existing.mbid;
}

export async function resolveItunesToMbid(
  itunesTrackId: string,
  artist: string,
  title: string,
  coverArtUrl?: string,
  durationMs?: number,
  previewUrl?: string,
  album?: string
): Promise<string | null> {
  const existing = await getItunesMapping(itunesTrackId);
  if (existing) {
    const cached = await acceptCachedMapping(
      existing,
      artist,
      title,
      album,
      durationMs
    );
    if (cached) return cached;
  }

  const queryTitle = itunesResolveQueryTitle(title);

  try {
    const luceneQuery = album
      ? `recording:"${queryTitle}" AND artist:"${artist}" AND release:"${album}"`
      : `recording:"${queryTitle}" AND artist:"${artist}"`;

    let searchResult = await searchRecordings(luceneQuery, 15, 0);
    let recordings = searchResult.recordings || [];

    // Fallback without release filter if album-scoped search is empty
    if (recordings.length === 0 && album) {
      searchResult = await searchRecordings(
        `recording:"${queryTitle}" AND artist:"${artist}"`,
        15,
        0
      );
      recordings = searchResult.recordings || [];
    }

    const ranked = [...recordings].sort(
      (a, b) =>
        scoreMbRecording(b, artist, queryTitle, album, durationMs) -
        scoreMbRecording(a, artist, queryTitle, album, durationMs)
    );

    const { mbid: topPick } = pickBestRecording(
      ranked,
      artist,
      queryTitle,
      album,
      durationMs
    );

    const candidates = topPick
      ? [topPick, ...ranked.filter((r) => r.id !== topPick).map((r) => r.id)]
      : ranked.map((r) => r.id);

    for (const candidateMbid of candidates.slice(0, 3)) {
      const recording = ranked.find((r) => r.id === candidateMbid);
      if (!recording) continue;

      const candidateScore = scoreMbRecording(
        recording,
        artist,
        queryTitle,
        album,
        durationMs
      );
      if (candidateScore < MIN_RESOLUTION_SCORE) continue;

      const verified = await verifyMbidMatchesContext(
        candidateMbid,
        artist,
        queryTitle,
        album,
        durationMs
      );
      if (!verified.ok) {
        console.warn(
          `Rejected iTunes→MBID ${itunesTrackId}→${candidateMbid}: ${verified.reason}`
        );
        continue;
      }

      await cacheItunesMapping({
        itunesTrackId,
        mbid: candidateMbid,
        title,
        artist,
        albumTitle: album ?? null,
        coverArtUrl: coverArtUrl || null,
        durationMs: durationMs || null,
        previewUrl: previewUrl || null,
      });
      return candidateMbid;
    }
  } catch (err) {
    console.error("MusicBrainz resolution failed:", err);
  }

  return null;
}
