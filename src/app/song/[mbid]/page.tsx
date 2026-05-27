import Link from "next/link";
import type { SongData } from "@/lib/types";
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

async function aggregateSong(mbid: string): Promise<SongData> {
  const cached = await getCachedSong(mbid);
  if (cached) return cached;

  const recording = await getRecordingWithRels(mbid);

  const artist = recording["artist-credit"]
    ?.map((ac) => ac.name)
    .join(", ") ?? "Unknown Artist";
  const title = recording.title;
  const bestRelease = selectBestRelease(recording.releases ?? []);
  const albumTitle = bestRelease?.title ?? null;
  const albumMbid = bestRelease?.id ?? null;
  const releaseDate = bestRelease?.date ?? null;
  const durationMs = recording.length ?? null;

  const credits = extractCredits(recording.relations ?? []);
  const sampleRelationships = extractSamples(recording.relations ?? []);

  const provider = createProvider();

  const [lyricsResult, coverArtUrl, audioFeatures, discogsEnrichment] =
    await Promise.all([
      getLyrics(artist, title),
      albumMbid ? getCoverArt(albumMbid) : Promise.resolve(null),
      provider.getFeatures({ mbid, artist, title }),
      albumTitle
        ? getDiscogsCredits(artist, albumTitle, title)
        : Promise.resolve(null),
    ]);

  const songData: SongData = {
    mbid,
    title,
    artist,
    albumTitle,
    albumMbid,
    releaseDate,
    durationMs,
    coverArtUrl,
    lyrics: lyricsResult?.plainLyrics ?? null,
    syncedLyrics: lyricsResult?.syncedLyrics ?? null,
    bpm: audioFeatures?.bpm ? Math.round(audioFeatures.bpm) : null,
    musicalKey: audioFeatures?.key ?? null,
    audioFeatures,
    credits,
    sampleRelationships,
    discogsEnrichment,
    metadata: {},
  };

  cacheSong(songData).catch(() => {});

  return songData;
}

export default async function SongPage({
  params,
}: {
  params: Promise<{ mbid: string }>;
}) {
  const { mbid } = await params;

  let song: SongData;
  try {
    song = await aggregateSong(mbid);
  } catch {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <p className="text-red-400">Failed to load song data.</p>
        <Link
          href="/"
          className="mt-4 inline-block text-dg-accent-blue hover:underline"
        >
          Back to search
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link
        href="/"
        className="text-sm text-dg-accent-blue hover:underline"
      >
        &larr; Back to search
      </Link>

      <div className="mt-6 space-y-6">
        <SongHeader song={song} />
        <AudioFeatures features={song.audioFeatures} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LyricsPanel lyrics={song.lyrics} />
          <div className="space-y-6">
            <CreditsBlock
              credits={song.credits}
              discogs={song.discogsEnrichment}
            />
            <SamplesBlock samples={song.sampleRelationships} />
          </div>
        </div>
      </div>
    </main>
  );
}
