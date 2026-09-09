import { NextRequest, NextResponse } from "next/server";
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
import { getCachedSong } from "@/lib/cache";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mbid: string }> }
) {
  const { mbid } = await params;

  // Fast path: cache hit
  const cached = await getCachedSong(mbid);
  if (cached) {
    return NextResponse.json({
      mbid,
      title: cached.title,
      artist: cached.artist,
      coverArtUrl: cached.coverArtUrl,
      lyrics: cached.lyrics,
      audioFeatures: cached.audioFeatures,
      credits: cached.credits,
      discogsEnrichment: cached.discogsEnrichment,
      sampleRelationships: cached.sampleRelationships,
      releaseDate: cached.releaseDate,
      albumTitle: cached.albumTitle,
      durationMs: cached.durationMs,
    });
  }

  // Full fetch
  const recording = await getRecordingWithRels(mbid);
  const artist =
    recording["artist-credit"]?.map((ac: { name: string }) => ac.name).join(", ") ??
    "Unknown Artist";
  const title = recording.title;
  const bestRelease = selectBestRelease(recording.releases ?? []);
  const albumTitle = bestRelease?.title || null;
  const albumMbid = bestRelease?.id ?? null;
  const releaseDate = bestRelease?.date ?? null;
  const durationMs = recording.length ?? null;
  const credits = extractCredits(recording.relations ?? []);
  const sampleRelationships = extractSamples(recording.relations ?? []);

  const provider = createProvider();
  const [coverArtUrl, lyricsResult, audioFeatures, discogsEnrichment] =
    await Promise.all([
      albumMbid
        ? getCoverArt(albumMbid).then(
            (caaUrl) => caaUrl || getAlternativeCoverArt(artist, title, albumTitle)
          )
        : getAlternativeCoverArt(artist, title, albumTitle),
      getLyrics(artist, title),
      provider.getFeatures({ mbid, artist, title }),
      getDiscogsCredits(artist, albumTitle, title),
    ]);

  return NextResponse.json({
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
  });
}
