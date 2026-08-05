import { NextRequest, NextResponse } from "next/server";
import { createProvider } from "@/lib/audio-features";
import { getCachedSong, cacheSong } from "@/lib/cache";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Internal server error";
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mbid = searchParams.get("mbid");
  const artist = searchParams.get("artist");
  const title = searchParams.get("title");

  if (!mbid || !artist || !title) {
    return NextResponse.json(
      { error: "Missing required parameters: mbid, artist, title" },
      { status: 400 }
    );
  }

  try {
    const provider = createProvider();
    console.log(`Polling FreqBlog for "${artist} - ${title}" (${mbid})...`);
    
    const features = await provider.getFeatures({ mbid, artist, title });

    if (features && features.status === "success") {
      // Fetch current cached song to avoid losing other fields (lyrics, credits, etc.)
      const cached = await getCachedSong(mbid);
      
      const songData = {
        mbid,
        title: cached?.title || title,
        artist: cached?.artist || artist,
        albumTitle: cached?.albumTitle || null,
        albumMbid: cached?.albumMbid || null,
        releaseDate: cached?.releaseDate || null,
        durationMs: cached?.durationMs || null,
        coverArtUrl: cached?.coverArtUrl || null,
        lyrics: cached?.lyrics || null,
        syncedLyrics: cached?.syncedLyrics || null,
        bpm: features.bpm ? Math.round(features.bpm) : null,
        musicalKey: features.key || null,
        audioFeatures: features,
        credits: cached?.credits || [],
        sampleRelationships: cached?.sampleRelationships || [],
        discogsEnrichment: cached?.discogsEnrichment || null,
        metadata: cached?.metadata || {},
      };

      // Write complete features back to PostgreSQL cache
      await cacheSong(songData);
      console.log(`✔ Cache updated successfully for ${mbid} with final features.`);

      return NextResponse.json({ status: "success", features });
    } else if (features && features.status === "queued") {
      return NextResponse.json({ status: "queued" });
    }

    return NextResponse.json({ status: "error" });
  } catch (err: unknown) {
    console.error("Features polling route failed:", err);
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}
