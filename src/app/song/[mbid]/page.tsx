import { Suspense } from "react";
import Link from "next/link";
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
import { getCoverArt } from "@/lib/cover-art";
import { createProvider } from "@/lib/audio-features";
import { getDiscogsCredits } from "@/lib/discogs";
import { getCachedSong, cacheSong } from "@/lib/cache";
import { SongHeader } from "@/components/SongHeader";
import { AudioFeatures } from "@/components/AudioFeatures";
import { LyricsPanel } from "@/components/LyricsPanel";
import { CreditsBlock } from "@/components/CreditsBlock";
import { SamplesBlock } from "@/components/SamplesBlock";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ShareButton } from "@/components/ShareButton";

// --- Skeleton fallback components ---

function SongHeaderSkeleton() {
  return (
    <div className="flex gap-6 items-start animate-pulse">
      <div className="w-[200px] h-[200px] rounded-lg bg-dg-surface-elevated shrink-0" />
      <div className="min-w-0 pt-2 flex-1 space-y-3">
        <div className="h-8 w-3/4 rounded bg-dg-surface-elevated" />
        <div className="h-5 w-1/2 rounded bg-dg-surface-elevated" />
        <div className="h-4 w-1/3 rounded bg-dg-surface-elevated" />
        <div className="flex gap-3 mt-3">
          <div className="h-3 w-16 rounded bg-dg-surface-elevated" />
          <div className="h-3 w-12 rounded bg-dg-surface-elevated" />
        </div>
      </div>
    </div>
  );
}

function AudioFeaturesSkeleton() {
  return (
    <div className="panel p-4 animate-pulse">
      <div className="h-4 w-28 rounded bg-dg-surface-elevated mb-3" />
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 w-20 rounded bg-dg-surface-elevated" />
        ))}
      </div>
    </div>
  );
}

function PanelSkeleton({ title, lines }: { title: string; lines: number }) {
  return (
    <div className="panel p-4 animate-pulse">
      <div className="text-sm font-medium text-dg-accent-violet uppercase tracking-wide mb-3">
        {title}
      </div>
      <div className="space-y-2">
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className="h-3 rounded bg-dg-surface-elevated"
            style={{ width: `${60 + (i % 4) * 10}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// --- Async wrapper components (each awaits its own promise) ---

async function SongHeaderStreamed({
  dataPromise,
}: {
  dataPromise: Promise<{
    title: string;
    artist: string;
    albumTitle: string | null;
    releaseDate: string | null;
    durationMs: number | null;
    coverArtUrl: string | null;
  }>;
}) {
  const data = await dataPromise;
  return <SongHeader {...data} />;
}

async function AudioFeaturesStreamed({
  dataPromise,
}: {
  dataPromise: Promise<AudioFeaturesResult | null>;
}) {
  const features = await dataPromise;
  return <AudioFeatures features={features} />;
}

async function LyricsPanelStreamed({
  dataPromise,
}: {
  dataPromise: Promise<LrclibResult | null>;
}) {
  const result = await dataPromise;
  return <LyricsPanel lyrics={result?.plainLyrics ?? null} />;
}

async function CreditsBlockStreamed({
  creditsPromise,
  discogsPromise,
}: {
  creditsPromise: Promise<Credit[]>;
  discogsPromise: Promise<DiscogsEnrichment | null>;
}) {
  const [credits, discogs] = await Promise.all([
    creditsPromise,
    discogsPromise,
  ]);
  return <CreditsBlock credits={credits} discogs={discogs} />;
}

async function SamplesBlockStreamed({
  dataPromise,
}: {
  dataPromise: Promise<SampleRelationship[]>;
}) {
  const samples = await dataPromise;
  return <SamplesBlock samples={samples} />;
}

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
  searchParams: Promise<{ artist?: string; title?: string }>;
}) {
  const [{ mbid }, qp] = await Promise.all([params, searchParams]);

  // Fast path: cache hit renders everything synchronously
  const cached = await getCachedSong(mbid);
  if (cached) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-dg-accent-blue hover:underline"
          >
            &larr; Back to search
          </Link>
          <div className="flex items-center gap-3">
            <ShareButton mbid={mbid} />
            <FavoriteButton
              song={{
                mbid,
                title: cached.title,
                artist: cached.artist,
                coverArtUrl: cached.coverArtUrl,
              }}
            />
          </div>
        </div>
        <div className="mt-6 space-y-6">
          <SongHeader
            title={cached.title}
            artist={cached.artist}
            albumTitle={cached.albumTitle}
            releaseDate={cached.releaseDate}
            durationMs={cached.durationMs}
            coverArtUrl={cached.coverArtUrl}
          />
          <AudioFeatures features={cached.audioFeatures} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <LyricsPanel lyrics={cached.lyrics} />
            <div className="space-y-6">
              <CreditsBlock
                credits={cached.credits}
                discogs={cached.discogsEnrichment}
              />
              <SamplesBlock samples={cached.sampleRelationships} />
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Tier 0: fire FreqBlog early if search params available
  const provider = createProvider();
  let earlyAudioFeaturesPromise: Promise<AudioFeaturesResult | null> | null =
    null;
  if (qp.artist && qp.title) {
    earlyAudioFeaturesPromise = provider.getFeatures({
      mbid,
      artist: qp.artist,
      title: qp.title,
    });
  }

  // Tier 1: await MusicBrainz (only blocking await in the page)
  const recording = await getRecordingWithRels(mbid);

  const artist =
    recording["artist-credit"]?.map((ac) => ac.name).join(", ") ??
    "Unknown Artist";
  const title = recording.title;
  const bestRelease = selectBestRelease(recording.releases ?? []);
  const albumTitle = bestRelease?.title ?? null;
  const albumMbid = bestRelease?.id ?? null;
  const releaseDate = bestRelease?.date ?? null;
  const durationMs = recording.length ?? null;
  const credits = extractCredits(recording.relations ?? []);
  const sampleRelationships = extractSamples(recording.relations ?? []);

  // Tier 2: fire all parallel promises WITHOUT awaiting
  const coverArtPromise = albumMbid
    ? getCoverArt(albumMbid)
    : Promise.resolve(null);
  const lyricsPromise = getLyrics(artist, title);
  const audioFeaturesPromise =
    earlyAudioFeaturesPromise ?? provider.getFeatures({ mbid, artist, title });
  const discogsPromise = albumTitle
    ? getDiscogsCredits(artist, albumTitle, title)
    : Promise.resolve(null);

  // Header data: MB text fields + cover art (resolves when CAA responds)
  const headerDataPromise = coverArtPromise.then((coverArtUrl) => ({
    title,
    artist,
    albumTitle,
    releaseDate,
    durationMs,
    coverArtUrl,
  }));

  // Fire-and-forget cache write once all promises settle
  writeCacheInBackground(
    mbid,
    {
      title,
      artist,
      albumTitle,
      albumMbid,
      releaseDate,
      durationMs,
      credits,
      sampleRelationships,
    },
    coverArtPromise,
    lyricsPromise,
    audioFeaturesPromise,
    discogsPromise
  );

  // Return JSX immediately — Suspense boundaries stream as promises resolve
  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="text-sm text-dg-accent-blue hover:underline"
        >
          &larr; Back to search
        </Link>
        <div className="flex items-center gap-3">
          <ShareButton mbid={mbid} />
          <FavoriteButton
            song={{
              mbid,
              title,
              artist,
              coverArtUrl: null,
            }}
          />
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <Suspense fallback={<SongHeaderSkeleton />}>
          <SongHeaderStreamed dataPromise={headerDataPromise} />
        </Suspense>

        <Suspense fallback={<AudioFeaturesSkeleton />}>
          <AudioFeaturesStreamed dataPromise={audioFeaturesPromise} />
        </Suspense>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Suspense fallback={<PanelSkeleton title="Lyrics" lines={12} />}>
            <LyricsPanelStreamed dataPromise={lyricsPromise} />
          </Suspense>

          <div className="space-y-6">
            <Suspense fallback={<PanelSkeleton title="Credits" lines={6} />}>
              <CreditsBlockStreamed
                creditsPromise={Promise.resolve(credits)}
                discogsPromise={discogsPromise}
              />
            </Suspense>

            <Suspense fallback={<PanelSkeleton title="Samples" lines={3} />}>
              <SamplesBlockStreamed
                dataPromise={Promise.resolve(sampleRelationships)}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}
