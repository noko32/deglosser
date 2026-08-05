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
import { getCoverArt, getAlternativeCoverArt } from "@/lib/cover-art";
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
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { HarmonicArchipelago } from "@/components/HarmonicArchipelago";

// --- Skeleton fallback components ---

function SongHeaderSkeleton() {
  return (
    <div className="panel p-5 flex flex-col sm:flex-row gap-6 items-start animate-pulse">
      <div className="w-full max-w-[280px] sm:w-[200px] aspect-square rounded-lg bg-dg-surface-elevated shrink-0" />
      <div className="min-w-0 pt-2 flex-1 space-y-3 w-full">
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
  mbid,
  artist,
  title,
}: {
  dataPromise: Promise<AudioFeaturesResult | null>;
  mbid: string;
  artist: string;
  title: string;
}) {
  const features = await dataPromise;
  return (
    <AudioFeatures
      key={mbid}
      features={features}
      mbid={mbid}
      artist={artist}
      title={title}
    />
  );
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

async function HarmonicArchipelagoStreamed({
  featuresPromise,
  mbid,
  title,
  artist,
  coverArtPromise,
}: {
  featuresPromise: Promise<AudioFeaturesResult | null>;
  mbid: string;
  title: string;
  artist: string;
  coverArtPromise: Promise<string | null>;
}) {
  const [features, coverArtUrl] = await Promise.all([
    featuresPromise,
    coverArtPromise,
  ]);

  if (!features || !features.bpm || (!features.camelot && !features.key)) {
    return null;
  }

  return (
    <HarmonicArchipelago
      initialSong={{
        mbid,
        title,
        artist,
        bpm: Math.round(features.bpm),
        musicalKey: features.camelot || features.key,
        coverArtUrl,
      }}
    />
  );
}

async function YouTubePlayerStreamed({
  discogsPromise,
  queryFallback,
}: {
  discogsPromise: Promise<DiscogsEnrichment | null>;
  queryFallback: string;
}) {
  const result = await discogsPromise;
  return <YouTubePlayer videos={result?.videos ?? []} queryFallback={queryFallback} />;
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
  searchParams: Promise<{ artist?: string; title?: string; cover?: string; album?: string }>;
}) {
  const [{ mbid }, qp] = await Promise.all([params, searchParams]);

  // Fast path: cache hit renders everything synchronously
  const cached = await getCachedSong(mbid);
  if (cached) {
    // Prefer the iTunes cover from search navigation — it's reliable and matches what the user clicked.
    const itunesCover = qp.cover
      ? qp.cover.replace("/100x100bb.jpg", "/600x600bb.jpg")
      : null;
    const coverArtUrl = itunesCover || cached.coverArtUrl;
    
    return (
      <main className="mx-auto max-w-3xl lg:max-w-5xl p-4 sm:p-6 lg:p-8">
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
                coverArtUrl: coverArtUrl,
              }}
            />
          </div>
        </div>
        <div className="mt-6 space-y-6">
          <SongHeader
            title={cached.title}
            artist={cached.artist}
            albumTitle={qp.album || cached.albumTitle}
            releaseDate={cached.releaseDate}
            durationMs={cached.durationMs}
            coverArtUrl={coverArtUrl}
            musicalKey={cached.musicalKey || cached.audioFeatures?.camelot || cached.audioFeatures?.key}
            bpm={cached.bpm || (cached.audioFeatures?.bpm ? Math.round(cached.audioFeatures.bpm) : null)}
            mood={cached.audioFeatures?.mood}
          />
          <AudioFeatures
            key={mbid}
            features={cached.audioFeatures}
            mbid={mbid}
            artist={cached.artist}
            title={cached.title}
          />
          {((cached.bpm || cached.audioFeatures?.bpm) && (cached.musicalKey || cached.audioFeatures?.camelot || cached.audioFeatures?.key)) && (
            <HarmonicArchipelago
              initialSong={{
                mbid,
                title: cached.title,
                artist: cached.artist,
                bpm: cached.bpm || Math.round(cached.audioFeatures!.bpm!),
                musicalKey: cached.musicalKey || cached.audioFeatures?.camelot || cached.audioFeatures!.key!,
                coverArtUrl: coverArtUrl,
              }}
            />
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <LyricsPanel lyrics={cached.lyrics} />
            <div className="space-y-6">
              <YouTubePlayer
                videos={cached.discogsEnrichment?.videos}
                queryFallback={`${cached.artist} - ${cached.title}`}
              />
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
  const bestRelease = selectBestRelease(recording.releases ?? [], qp.album);
  const albumTitle = qp.album || bestRelease?.title || null;
  const albumMbid = bestRelease?.id ?? null;
  const releaseDate = bestRelease?.date ?? null;
  const durationMs = recording.length ?? null;
  const credits = extractCredits(recording.relations ?? []);
  const sampleRelationships = extractSamples(recording.relations ?? []);

  // Prefer iTunes cover from search click; CAA/alternatives fill gaps.
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
    <main className="mx-auto max-w-3xl lg:max-w-5xl p-4 sm:p-6 lg:p-8">
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
          <AudioFeaturesStreamed
            dataPromise={audioFeaturesPromise}
            mbid={mbid}
            artist={artist}
            title={title}
          />
        </Suspense>

        <Suspense fallback={null}>
          <HarmonicArchipelagoStreamed
            featuresPromise={audioFeaturesPromise}
            mbid={mbid}
            title={title}
            artist={artist}
            coverArtPromise={coverArtPromise}
          />
        </Suspense>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Suspense fallback={<PanelSkeleton title="Lyrics" lines={12} />}>
            <LyricsPanelStreamed dataPromise={lyricsPromise} />
          </Suspense>

          <div className="space-y-6">
            <Suspense fallback={<PanelSkeleton title="Listen / Stream Player" lines={6} />}>
              <YouTubePlayerStreamed
                discogsPromise={discogsPromise}
                queryFallback={`${artist} - ${title}`}
              />
            </Suspense>

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
