import type {
  SongData,
  Credit,
  SampleRelationship,
  AudioFeaturesResult,
  DiscogsEnrichment,
} from "@/lib/types";
import type { LrclibResult } from "@/lib/lrclib";
import {
  getRecordingWithRels,
  selectBestRelease,
  extractCredits,
  extractSamples,
} from "@/lib/musicbrainz";
import { getLyrics } from "@/lib/lrclib";
import { getCoverArt, getAlternativeCoverArt } from "@/lib/cover-art";
import { createProvider } from "@/lib/audio-features";
import { getDiscogsCredits } from "@/lib/discogs";
import { getCachedSong, cacheSong } from "@/lib/cache";
import { resolveArchipelagoMetadata } from "@/lib/archipelago-fallback";
import { SongDetailView } from "./SongDetailView";

// --- Cache writer (fire-and-forget, collects all promise results) ---

async function writeCacheInBackground(
  mbid: string,
  mbData: {
    title: string;
    artist: string;
    albumTitle: string | null;
    albumMbid: string | null;
    releaseDate: string | null;
    durationMs: number | null;
    credits: Credit[];
    sampleRelationships: SampleRelationship[];
  },
  coverArtPromise: Promise<string | null>,
  lyricsPromise: Promise<LrclibResult | null>,
  audioFeaturesPromise: Promise<AudioFeaturesResult | null>,
  discogsPromise: Promise<DiscogsEnrichment | null>
) {
  try {
    const [coverArtUrl, lyricsResult, audioFeatures, discogsEnrichment] =
      await Promise.all([
        coverArtPromise,
        lyricsPromise,
        audioFeaturesPromise,
        discogsPromise,
      ]);

    const songData: SongData = {
      mbid,
      ...mbData,
      coverArtUrl,
      lyrics: lyricsResult?.plainLyrics ?? null,
      syncedLyrics: lyricsResult?.syncedLyrics ?? null,
      bpm: audioFeatures?.bpm ? Math.round(audioFeatures.bpm) : null,
      musicalKey: audioFeatures?.key ?? null,
      audioFeatures,
      discogsEnrichment,
      metadata: {},
    };

    await cacheSong(songData);
  } catch {
    // Cache write failure is non-fatal
  }
}

// --- Page component ---

export default async function SongPage({
  params,
  searchParams,
}: {
  params: Promise<{ mbid: string }>;
  searchParams: Promise<{
    artist?: string;
    title?: string;
    cover?: string;
    album?: string;
    from?: string;
  }>;
}) {
  const [{ mbid }, qp] = await Promise.all([params, searchParams]);

  // Fast path: cache hit
  const cached = await getCachedSong(mbid);
  if (cached) {
    const itunesCover = qp.cover
      ? qp.cover.replace("/100x100bb.jpg", "/600x600bb.jpg")
      : null;
    const coverArtUrl = itunesCover || cached.coverArtUrl;

    const rawBpm = cached.bpm || (cached.audioFeatures?.bpm ? Math.round(cached.audioFeatures.bpm) : null);
    const rawKey = cached.musicalKey || cached.audioFeatures?.camelot || cached.audioFeatures?.key || null;
    const meta = resolveArchipelagoMetadata(rawBpm, rawKey);

    return (
      <SongDetailView
        initialSong={{
          mbid,
          title: cached.title,
          artist: cached.artist,
          bpm: meta.bpm,
          musicalKey: meta.musicalKey,
          coverArtUrl,
          isEstimated: meta.isEstimated,
        }}
        songData={{
          mbid,
          title: cached.title,
          artist: cached.artist,
          coverArtUrl,
          lyrics: cached.lyrics,
          audioFeatures: cached.audioFeatures,
          credits: cached.credits,
          discogsEnrichment: cached.discogsEnrichment,
          sampleRelationships: cached.sampleRelationships,
          releaseDate: cached.releaseDate,
          albumTitle: qp.album || cached.albumTitle,
          durationMs: cached.durationMs,
        }}
        from={qp.from}
      />
    );
  }

  // Tier 0: fire FreqBlog early if search params available
  const provider = createProvider();
  let earlyAudioFeaturesPromise: Promise<AudioFeaturesResult | null> | null = null;
  if (qp.artist && qp.title) {
    earlyAudioFeaturesPromise = provider.getFeatures({ mbid, artist: qp.artist, title: qp.title });
  }

  // Tier 1: await MusicBrainz
  const recording = await getRecordingWithRels(mbid);
  const artist = recording["artist-credit"]?.map((ac) => ac.name).join(", ") ?? "Unknown Artist";
  const title = recording.title;
  const bestRelease = selectBestRelease(recording.releases ?? [], qp.album);
  const albumTitle = qp.album || bestRelease?.title || null;
  const albumMbid = bestRelease?.id ?? null;
  const releaseDate = bestRelease?.date ?? null;
  const durationMs = recording.length ?? null;
  const credits = extractCredits(recording.relations ?? []);
  const sampleRelationships = extractSamples(recording.relations ?? []);

  const itunesCover = qp.cover
    ? qp.cover.replace("/100x100bb.jpg", "/600x600bb.jpg")
    : null;
  const coverArtPromise = itunesCover
    ? Promise.resolve(itunesCover)
    : albumMbid
      ? getCoverArt(albumMbid).then(
          (caaUrl) => caaUrl || getAlternativeCoverArt(artist, title, albumTitle)
        )
      : getAlternativeCoverArt(artist, title, albumTitle);

  const lyricsPromise = getLyrics(artist, title);
  const audioFeaturesPromise =
    earlyAudioFeaturesPromise ?? provider.getFeatures({ mbid, artist, title });
  const discogsPromise = getDiscogsCredits(artist, albumTitle, title);

  // Await all streamed data for the drawer
  const [coverArtUrl, lyricsResult, audioFeatures, discogsEnrichment] = await Promise.all([
    coverArtPromise,
    lyricsPromise,
    audioFeaturesPromise,
    discogsPromise,
  ]);

  // Fire-and-forget cache write
  writeCacheInBackground(
    mbid,
    { title, artist, albumTitle, albumMbid, releaseDate, durationMs, credits, sampleRelationships },
    Promise.resolve(coverArtUrl),
    Promise.resolve(lyricsResult),
    Promise.resolve(audioFeatures),
    Promise.resolve(discogsEnrichment)
  );

  const rawBpm = audioFeatures?.bpm ? Math.round(audioFeatures.bpm) : null;
  const rawKey = audioFeatures?.camelot || audioFeatures?.key || null;
  const meta = resolveArchipelagoMetadata(rawBpm, rawKey);

  return (
    <SongDetailView
      initialSong={{
        mbid,
        title,
        artist,
        bpm: meta.bpm,
        musicalKey: meta.musicalKey,
        coverArtUrl,
        isEstimated: meta.isEstimated,
      }}
      songData={{
        mbid,
        title,
        artist,
        coverArtUrl,
        lyrics: lyricsResult?.plainLyrics ?? null,
        audioFeatures,
        credits,
        discogsEnrichment,
        sampleRelationships,
        releaseDate,
        albumTitle,
        durationMs,
      }}
      from={qp.from}
    />
  );
}
