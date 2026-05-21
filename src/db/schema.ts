import {
  pgTable,
  text,
  timestamp,
  jsonb,
  primaryKey,
  integer,
} from "drizzle-orm/pg-core";

export const songs = pgTable("songs", {
  mbid: text("mbid").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  albumTitle: text("album_title"),
  albumMbid: text("album_mbid"),
  releaseDate: text("release_date"),
  durationMs: integer("duration_ms"),
  coverArtUrl: text("cover_art_url"),
  lyrics: text("lyrics"),
  syncedLyrics: text("synced_lyrics"),
  bpm: integer("bpm"),
  musicalKey: text("musical_key"),
  audioFeatures: jsonb("audio_features"),
  credits: jsonb("credits"),
  sampleRelationships: jsonb("sample_relationships"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  clerkId: text("clerk_id").primaryKey(),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userFavorites = pgTable(
  "user_favorites",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.clerkId, { onDelete: "cascade" }),
    songMbid: text("song_mbid")
      .notNull()
      .references(() => songs.mbid, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.songMbid] })]
);

export const searchHistory = pgTable("search_history", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.clerkId, { onDelete: "cascade" }),
  query: text("query").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
