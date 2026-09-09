import { getDb } from "@/db";
import { songs } from "@/db/schema";
import { and, gte, lte, inArray, ne } from "drizzle-orm";
import type { SongData } from "./types";
import { toCamelot, getDbMatchingKeys } from "./key-converter";

interface DjangoRecommendationResponse {
  status: string;
  input: {
    bpm: number;
    key: string;
  };
  matching_criteria: {
    compatible_keys: string[];
    bpm_range: {
      min: number;
      max: number;
    };
    tolerance_percentage: number;
  };
}

export interface CuratedClassicTrack {
  mbid: string;
  title: string;
  artist: string;
  bpm: number;
  musicalKey: string;
  coverArtUrl: string;
}

const CURATED_CLASSICS: CuratedClassicTrack[] = [
  // 1A / 1B
  { mbid: "curated-1a-1", title: "As It Was", artist: "Harry Styles", bpm: 174, musicalKey: "1A", coverArtUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/4a/db/aa/4adbaae4-77e8-b7f7-b080-60b64d0bc7aa/190758428525.jpg/100x100bb.jpg" },
  { mbid: "curated-1b-1", title: "Midnight City", artist: "M83", bpm: 105, musicalKey: "1B", coverArtUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/a5/d8/df/a5d8dfbe-5444-be6c-67bd-f404ee5315b6/009414324200.jpg/100x100bb.jpg" },
  // 2A / 2B
  { mbid: "curated-2a-1", title: "Stronger", artist: "Kanye West", bpm: 104, musicalKey: "2A", coverArtUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/8e/3c/60/8e3c604b-324e-bbbc-e5f8-bd64ebc3c3e2/00602517454848.jpg/100x100bb.jpg" },
  { mbid: "curated-2b-1", title: "Cruel Summer", artist: "Taylor Swift", bpm: 170, musicalKey: "2B", coverArtUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/8b/ca/02/8bca02fa-0e7d-cc2b-23af-658b738fc9f1/198588204689.jpg/100x100bb.jpg" },
  // 3A / 3B
  { mbid: "curated-Starboy", title: "Starboy", artist: "The Weeknd ft. Daft Punk", bpm: 186, musicalKey: "3A", coverArtUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/b5/1d/15/b51d156b-a2c9-9407-7422-7729f2730cf1/16UMGIM69450.jpg/100x100bb.jpg" },
  { mbid: "curated-3b-1", title: "Royals", artist: "Lorde", bpm: 85, musicalKey: "3B", coverArtUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/4a/0b/40/4a0b40eb-ba54-20a7-cf23-5e9f5ff771a3/13UMGIM35223.jpg/100x100bb.jpg" },
  // 4A / 4B
  { mbid: "curated-4a-1", title: "Stayin Alive", artist: "Bee Gees", bpm: 104, musicalKey: "4A", coverArtUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/1e/85/74/1e8574be-e283-42e8-d62a-fc549303350e/00602557343416.jpg/100x100bb.jpg" },
  { mbid: "curated-4b-1", title: "Umbrella", artist: "Rihanna", bpm: 90, musicalKey: "4B", coverArtUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/a4/09/a4/a409a473-b3aa-c0ef-1ef1-f09c2a3962d7/00602517336717.jpg/100x100bb.jpg" },
  // 5A / 5B
  { mbid: "curated-5a-1", title: "Levitating", artist: "Dua Lipa", bpm: 103, musicalKey: "5A", coverArtUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/81/1a/c1/811ac125-de9b-f112-9c4b-3269a9e3f65b/190295244583.jpg/100x100bb.jpg" },
  { mbid: "curated-5b-1", title: "Coldplay", artist: "Clocks", bpm: 131, musicalKey: "5B", coverArtUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/9c/e8/35/9ce83561-eb37-e0ec-df88-661ff9e58b87/094632194950.jpg/100x100bb.jpg" },
  // 6A / 6B
  { mbid: "curated-6a-1", title: "Get Lucky", artist: "Daft Punk", bpm: 116, musicalKey: "6A", coverArtUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/c1/57/ca/c157ca94-0d7a-cfb3-90d5-ef757914bfb2/886443927878.jpg/100x100bb.jpg" },
  { mbid: "curated-6b-1", title: "Wake Me Up", artist: "Avicii", bpm: 124, musicalKey: "6B", coverArtUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/ca/87/be/ca87bec5-a3d8-04fb-cc30-80fa2a912cb8/13UMGIM22368.jpg/100x100bb.jpg" },
  // 7A / 7B
  { mbid: "curated-7a-1", title: "Breathe", artist: "The Prodigy", bpm: 130, musicalKey: "7A", coverArtUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/5a/8e/3c/5a8e3cb9-a1b7-a35c-2057-73d81b37d45c/634904011462.jpg/100x100bb.jpg" },
  { mbid: "curated-7b-1", title: "One More Time", artist: "Daft Punk", bpm: 123, musicalKey: "7B", coverArtUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/a4/09/b8/a409b85c-43df-40cb-56ef-62bcda64d4b1/072438505505.jpg/100x100bb.jpg" },
  // 8A / 8B
  { mbid: "curated-8a-1", title: "Losing It", artist: "FISHER", bpm: 125, musicalKey: "8A", coverArtUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/77/b0/38/777038be-32e6-a8fa-71be-cf2bf72da80b/190295551988.jpg/100x100bb.jpg" },
  { mbid: "curated-8b-1", title: "Don't Start Now", artist: "Dua Lipa", bpm: 124, musicalKey: "8B", coverArtUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/d9/b4/0c/d9b40cca-5b58-e395-5853-9db8935c1065/190295325855.jpg/100x100bb.jpg" },
  // 9A / 9B
  { mbid: "curated-9a-1", title: "Heads Will Roll", artist: "Yeah Yeah Yeahs", bpm: 132, musicalKey: "9A", coverArtUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/df/e8/69/dfe86985-78e7-ba35-df4d-db884b2be289/09UMGIM10156.jpg/100x100bb.jpg" },
  { mbid: "curated-9b-1", title: "Levels", artist: "Avicii", bpm: 126, musicalKey: "9B", coverArtUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/f4/bf/a4/f4bfa4f1-6cf5-6c47-3cf9-8cc440ee56d1/11UMGIM16401.jpg/100x100bb.jpg" },
  // 10A / 10B
  { mbid: "curated-10a-1", title: "Flowers", artist: "Miley Cyrus", bpm: 118, musicalKey: "10A", coverArtUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music113/v4/37/60/a4/3760a4f5-5683-1678-0a0e-436be31d9774/196589714828.jpg/100x100bb.jpg" },
  { mbid: "curated-10b-1", title: "Attention", artist: "Charlie Puth", bpm: 100, musicalKey: "10B", coverArtUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/80/c8/10/808c10e6-58c0-bc6d-6258-20412b3be739/075679891464.jpg/100x100bb.jpg" },
  // 11A / 11B
  { mbid: "curated-11a-1", title: "Billie Jean", artist: "Michael Jackson", bpm: 117, musicalKey: "11A", coverArtUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/09/b3/ff/09b3ff89-7f52-87db-2b50-dfd332616f73/886443621455.jpg/100x100bb.jpg" },
  { mbid: "curated-11b-1", title: "Toxic", artist: "Britney Spears", bpm: 143, musicalKey: "11B", coverArtUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/ca/ee/be/caeebe14-b816-160b-85ca-bda091176b6d/828765324522.jpg/100x100bb.jpg" },
  // 12A / 12B
  { mbid: "curated-12a-1", title: "Blinding Lights", artist: "The Weeknd", bpm: 171, musicalKey: "12A", coverArtUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/a4/bb/11/a4bb1156-f6d8-f604-db5f-d2320b925b42/19UMGIM70308.jpg/100x100bb.jpg" },
  { mbid: "curated-12b-1", title: "Save Your Tears", artist: "The Weeknd", bpm: 118, musicalKey: "12B", coverArtUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/8e/3c/60/8e3c604b-324e-bbbc-e5f8-bd64ebc3c3e2/00602517454848.jpg/100x100bb.jpg" },
];

export function calculateLocalRecommendations(bpm: number, camelotKey: string) {
  // Convert key to Camelot format
  const key = toCamelot(camelotKey).toUpperCase().trim();
  const match = key.match(/^(\d+)([AB])$/);

  let compatibleKeys = [key];
  if (match) {
    const num = parseInt(match[1], 10);
    const letter = match[2];
    const prevNum = num === 1 ? 12 : num - 1;
    const nextNum = num === 12 ? 1 : num + 1;
    const oppositeLetter = letter === "A" ? "B" : "A";

    compatibleKeys = [
      `${num}${letter}`,          // Same key
      `${prevNum}${letter}`,       // -1 step
      `${nextNum}${letter}`,       // +1 step
      `${num}${oppositeLetter}`,  // Mode shift (relative major/minor)
    ];
  }

  const minBpm = Math.round(bpm * 0.95 * 100) / 100;
  const maxBpm = Math.round(bpm * 1.05 * 100) / 100;

  return {
    compatibleKeys,
    bpmRange: { min: minBpm, max: maxBpm }
  };
}

export async function fetchHarmonicRecommendations(
  mbid: string,
  bpm: number,
  camelotKey: string,
  isEstimated: boolean = false
): Promise<Partial<SongData>[]> {
  const djangoUrl = process.env.DJANGO_API_URL || "http://localhost:8001";

  let compatibleKeys: string[] = [];
  let minBpm: number = 0;
  let maxBpm: number = 0;

  // Convert raw key to standard Camelot representation
  const standardCamelotInput = toCamelot(camelotKey);

  // When metadata is estimated (fallback defaults), widen tolerance
  const toleranceFactor = isEstimated ? 0.30 : 0.05;

  try {
    if (isEstimated) {
      // Skip Django for estimated songs
      throw new Error("Estimated metadata — using local wide-tolerance math");
    }
    const url = `${djangoUrl}/api/recommendations/?bpm=${bpm}&key=${encodeURIComponent(standardCamelotInput)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(1000) });

    if (res.ok) {
      const data: DjangoRecommendationResponse = await res.json();
      compatibleKeys = data.matching_criteria.compatible_keys;
      minBpm = data.matching_criteria.bpm_range.min;
      maxBpm = data.matching_criteria.bpm_range.max;
    } else {
      throw new Error(`Django API returned status ${res.status}`);
    }
  } catch (err) {
    console.warn("Django recommendations microservice unavailable, falling back to local math:", err);
    const local = calculateLocalRecommendations(bpm, standardCamelotInput);
    compatibleKeys = local.compatibleKeys;
    minBpm = Math.round(bpm * (1 - toleranceFactor) * 100) / 100;
    maxBpm = Math.round(bpm * (1 + toleranceFactor) * 100) / 100;
  }

  const roundedMin = Math.floor(minBpm);
  const roundedMax = Math.ceil(maxBpm);

  // Translate compatible Camelot keys into standard database names
  const databaseQueryKeys = getDbMatchingKeys(compatibleKeys);

  // Gather local DB candidates matching criteria
  let dbRecommendations: Partial<SongData>[] = [];
  try {
    const db = getDb();
    const rows = await db
      .select({
        mbid: songs.mbid,
        title: songs.title,
        artist: songs.artist,
        bpm: songs.bpm,
        musicalKey: songs.musicalKey,
        coverArtUrl: songs.coverArtUrl,
      })
      .from(songs)
      .where(
        and(
          ne(songs.mbid, mbid),
          inArray(songs.musicalKey, databaseQueryKeys),
          gte(songs.bpm, roundedMin),
          lte(songs.bpm, roundedMax)
        )
      )
      .limit(12);

    dbRecommendations = rows.map(r => ({
      mbid: r.mbid,
      title: r.title,
      artist: r.artist,
      bpm: r.bpm,
      musicalKey: toCamelot(r.musicalKey || ""),
      coverArtUrl: r.coverArtUrl?.replace("http://", "https://") ?? null,
    }));
  } catch (err) {
    console.error("Failed to query harmonic songs from DB:", err);
  }

  // Synthesize curated classics
  const targetKeysSet = new Set(compatibleKeys.map(k => k.toUpperCase()));
  const matchingClassics = CURATED_CLASSICS.filter(track => {
    const keyMatch = targetKeysSet.has(track.musicalKey.toUpperCase());
    const bpmMatch = track.bpm >= roundedMin && track.bpm <= roundedMax;
    const isCurrent = track.mbid === mbid;
    return keyMatch && bpmMatch && !isCurrent;
  }).map(c => ({
    mbid: c.mbid,
    title: c.title,
    artist: c.artist,
    bpm: c.bpm,
    musicalKey: c.musicalKey,
    coverArtUrl: c.coverArtUrl,
  }));

  // For estimated songs with sparse results, pull in curated classics
  if (isEstimated && matchingClassics.length < 8) {
    const allClassics = CURATED_CLASSICS.filter(c => c.mbid !== mbid).map(c => ({
      mbid: c.mbid,
      title: c.title,
      artist: c.artist,
      bpm: c.bpm,
      musicalKey: c.musicalKey,
      coverArtUrl: c.coverArtUrl,
    }));
    matchingClassics.push(...allClassics);
  }

  // Deduplicate combined lists
  const combined = [...dbRecommendations, ...matchingClassics];
  const deduplicated = deduplicateTracks(combined);

  return deduplicated.slice(0, 12);
}

/**
 * deduplication helper that normalizes titles and artists
 * (resolves "&" vs "and", punctuation, spacing, and casing differences)
 * and prefers records containing valid cover art URLs.
 */
function deduplicateTracks(tracks: Partial<SongData>[]): Partial<SongData>[] {
  const seen = new Set<string>();
  const unique: Partial<SongData>[] = [];

  for (const track of tracks) {
    if (!track.title || !track.artist) continue;

    const normTitle = track.title
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]/g, "")
      .trim();
    const normArtist = track.artist
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .trim();

    const dedupeKey = `${normArtist}:${normTitle}`;

    if (!seen.has(dedupeKey)) {
      seen.add(dedupeKey);
      unique.push(track);
    } else {
      const existingIdx = unique.findIndex(t => {
        const tTitle = t.title!.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "").trim();
        const tArtist = t.artist!.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
        return `${tArtist}:${tTitle}` === dedupeKey;
      });
      if (existingIdx !== -1) {
        const existing = unique[existingIdx];
        if (!existing.coverArtUrl && track.coverArtUrl) {
          unique[existingIdx] = track;
        }
      }
    }
  }

  return unique;
}
