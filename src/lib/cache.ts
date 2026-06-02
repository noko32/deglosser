import type { SongData } from "./types";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function dbAvailable(): boolean {
  return !!process.env.DATABASE_URL;
}

export async function getCachedSong(
  mbid: string
): Promise<SongData | null> {
  if (!dbAvailable()) return null;

  try {
    const { getDb } = await import("@/db");
    const { songs } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    const [row] = await getDb()
      .select()
      .from(songs)
      .where(eq(songs.mbid, mbid))
      .limit(1);

    if (!row) return null;

    const age = Date.now() - new Date(row.updatedAt).getTime();
    if (age > CACHE_TTL_MS) return null;

    return {
      mbid: row.mbid,
      title: row.title,
      artist: row.artist,
      albumTitle: row.albumTitle,
      albumMbid: row.albumMbid,
      releaseDate: row.releaseDate,
      durationMs: row.durationMs,
      coverArtUrl: row.coverArtUrl?.replace("http://", "https://") ?? null,
      lyrics: row.lyrics,
      syncedLyrics: row.syncedLyrics,
      bpm: row.bpm,
      musicalKey: row.musicalKey,
      audioFeatures: (row.audioFeatures as SongData["audioFeatures"]) ?? null,
      credits: (row.credits as SongData["credits"]) ?? [],
      sampleRelationships:
        (row.sampleRelationships as SongData["sampleRelationships"]) ?? [],
      discogsEnrichment:
        ((row.metadata as Record<string, unknown>)
          ?.discogsEnrichment as SongData["discogsEnrichment"]) ?? null,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
    };
  } catch {
    return null;
  }
}

export async function cacheSong(data: SongData): Promise<void> {
  if (!dbAvailable()) return;

  try {
    const { getDb } = await import("@/db");
    const { songs } = await import("@/db/schema");

    const now = new Date();

    await getDb()
      .insert(songs)
      .values({
        mbid: data.mbid,
        title: data.title,
        artist: data.artist,
        albumTitle: data.albumTitle,
        albumMbid: data.albumMbid,
        releaseDate: data.releaseDate,
        durationMs: data.durationMs,
        coverArtUrl: data.coverArtUrl,
        lyrics: data.lyrics,
        syncedLyrics: data.syncedLyrics,
        bpm: data.bpm,
        musicalKey: data.musicalKey,
        audioFeatures: data.audioFeatures,
        credits: data.credits,
        sampleRelationships: data.sampleRelationships,
        metadata: {
          ...data.metadata,
          discogsEnrichment: data.discogsEnrichment,
        },
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: songs.mbid,
        set: {
          title: data.title,
          artist: data.artist,
          albumTitle: data.albumTitle,
          albumMbid: data.albumMbid,
          releaseDate: data.releaseDate,
          durationMs: data.durationMs,
          coverArtUrl: data.coverArtUrl,
          lyrics: data.lyrics,
          syncedLyrics: data.syncedLyrics,
          bpm: data.bpm,
          musicalKey: data.musicalKey,
          audioFeatures: data.audioFeatures,
          credits: data.credits,
          sampleRelationships: data.sampleRelationships,
          metadata: {
            ...data.metadata,
            discogsEnrichment: data.discogsEnrichment,
          },
          updatedAt: now,
        },
      });
  } catch {
    // Cache write failure is non-fatal
  }
}
