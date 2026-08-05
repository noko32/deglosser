import type { SongData, ITunesMapping } from "./types";

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

export async function getItunesMapping(
  itunesTrackId: string
): Promise<ITunesMapping | null> {
  const map = await batchGetItunesMappings([itunesTrackId]);
  return map.get(itunesTrackId) ?? null;
}

export async function batchGetItunesMappings(
  itunesTrackIds: string[]
): Promise<Map<string, ITunesMapping>> {
  const result = new Map<string, ITunesMapping>();
  if (!dbAvailable() || itunesTrackIds.length === 0) return result;

  try {
    const { getDb } = await import("@/db");
    const { itunesMappings } = await import("@/db/schema");
    const { inArray } = await import("drizzle-orm");

    const rows = await getDb()
      .select()
      .from(itunesMappings)
      .where(inArray(itunesMappings.itunesTrackId, itunesTrackIds));

    for (const row of rows) {
      result.set(row.itunesTrackId, {
        itunesTrackId: row.itunesTrackId,
        mbid: row.mbid,
        title: row.title,
        artist: row.artist,
        albumTitle: row.albumTitle ?? null,
        coverArtUrl: row.coverArtUrl,
        durationMs: row.durationMs,
        previewUrl: row.previewUrl,
        createdAt: row.createdAt,
      });
    }
  } catch {
    // Non-fatal
  }

  return result;
}

export async function cacheItunesMapping(data: ITunesMapping): Promise<void> {
  if (!dbAvailable()) return;

  try {
    const { getDb } = await import("@/db");
    const { itunesMappings } = await import("@/db/schema");

    await getDb()
      .insert(itunesMappings)
      .values({
        itunesTrackId: data.itunesTrackId,
        mbid: data.mbid,
        title: data.title,
        artist: data.artist,
        albumTitle: data.albumTitle ?? null,
        coverArtUrl: data.coverArtUrl,
        durationMs: data.durationMs,
        previewUrl: data.previewUrl,
      })
      .onConflictDoUpdate({
        target: itunesMappings.itunesTrackId,
        set: {
          mbid: data.mbid,
          title: data.title,
          artist: data.artist,
          albumTitle: data.albumTitle ?? null,
          coverArtUrl: data.coverArtUrl,
          durationMs: data.durationMs,
          previewUrl: data.previewUrl,
        },
      });
  } catch {
    // Cache write failure is non-fatal
  }
}

export async function deleteItunesMapping(itunesTrackId: string): Promise<void> {
  if (!dbAvailable()) return;

  try {
    const { getDb } = await import("@/db");
    const { itunesMappings } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    await getDb()
      .delete(itunesMappings)
      .where(eq(itunesMappings.itunesTrackId, itunesTrackId));
  } catch {
    // Non-fatal
  }
}
