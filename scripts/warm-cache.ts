import dotenv from "dotenv";
import path from "path";

// Explicitly load .env.local for Next.js environment compatibility
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
// Fallback to standard .env
dotenv.config();

import { getDb } from "../src/db";
import { songs } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { searchITunesSongs, resolveItunesToMbid } from "../src/lib/itunes";
import { getRecordingWithRels, selectBestRelease, extractCredits, extractSamples } from "../src/lib/musicbrainz";
import { getCoverArt, getAlternativeCoverArt } from "../src/lib/cover-art";
import { getLyrics } from "../src/lib/lrclib";
import { createProvider } from "../src/lib/audio-features";
import { getDiscogsCredits } from "../src/lib/discogs";
import { cacheSong } from "../src/lib/cache";
import type { SongData } from "../src/lib/types";

// Setup environment override
// process.env.NODE_ENV is handled by runtime

// Highly structured list of high-relevance, harmonically compatible tracks spanning eras/genres
// Perfect for blending and creating dense, beautiful interconnected spider-nets!
const TARGET_INGEST_TRACKS = [
  { artist: "Charli XCX", title: "Von Dutch" },
  { artist: "Charli XCX", title: "Apple" },
  { artist: "Charli XCX", title: "360" },
  { artist: "Snoop Dogg", title: "Gin and Juice" },
  { artist: "Daft Punk", title: "One More Time" },
  { artist: "Daft Punk", title: "Get Lucky" },
  { artist: "Daft Punk", title: "Around the World" },
  { artist: "Dua Lipa", title: "Levitating" },
  { artist: "Dua Lipa", title: "Don't Start Now" },
  { artist: "Dua Lipa", title: "Houdini" },
  { artist: "Rihanna", title: "Umbrella" },
  { artist: "Rihanna", title: "Don't Stop the Music" },
  { artist: "Olivia Rodrigo", title: "traitor" },
  { artist: "Olivia Rodrigo", title: "bad idea right?" },
  { artist: "Billie Eilish", title: "bad guy" },
  { artist: "Billie Eilish", title: "LUNCH" },
  { artist: "The Weeknd", title: "Blinding Lights" },
  { artist: "The Weeknd", title: "Starboy" },
  { artist: "The Weeknd", title: "Save Your Tears" },
  { artist: "Harry Styles", title: "As It Was" },
  { artist: "Fred again..", title: "Billie (Loving Arms)" },
  { artist: "Fred again..", title: "Adore U" },
  { artist: "Peggy Gou", title: "(It Goes Like) Nanana" },
  { artist: "Disclosure", title: "Latch" },
  { artist: "Kanye West", title: "Stronger" },
  { artist: "Kanye West", title: "Power" },
  { artist: "Kanye West", title: "Flashing Lights" },
  { artist: "Drake", title: "Hotline Bling" },
  { artist: "Outkast", title: "Hey Ya!" },
  { artist: "Lady Gaga", title: "Bad Romance" },
  { artist: "Lady Gaga", title: "Poker Face" },
  { artist: "Michael Jackson", title: "Billie Jean" },
  { artist: "Michael Jackson", title: "Thriller" },
  { artist: "Queen", title: "Another One Bites the Dust" },
  { artist: "Fleetwood Mac", title: "Dreams" },
  { artist: "ABBA", title: "Dancing Queen" },
  { artist: "ABBA", title: "Gimme! Gimme! Gimme!" },
  { artist: "Madonna", title: "Hung Up" },
  { artist: "Calvin Harris", title: "Summer" },
  { artist: "Calvin Harris", title: "Feel So Close" },
  { artist: "Avicii", title: "Wake Me Up" },
  { artist: "Avicii", title: "Levels" },
  { artist: "Justice", title: "D.A.N.C.E." },
  { artist: "Swedish House Mafia", title: "Don't You Worry Child" },
  { artist: "LCD Soundsystem", title: "All My Friends" },
  { artist: "Kool & The Gang", title: "Summer Madness" },
  { artist: "Gorillaz", title: "Feel Good Inc." },
  { artist: "Bee Gees", title: "Stayin' Alive" },
  { artist: "Eurythmics", title: "Sweet Dreams (Are Made of This)" },
  { artist: "New Order", title: "Blue Monday" },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("=========================================");
  console.log("🌀 MELOMANO COGNITIVE CACHE WARMER ACTIVE 🌀");
  console.log("=========================================\n");

  const db = getDb();
  let successCount = 0;
  let skippedCount = 0;
  let failCount = 0;

  for (let i = 0; i < TARGET_INGEST_TRACKS.length; i++) {
    const track = TARGET_INGEST_TRACKS[i];
    const indexStr = `[${i + 1}/${TARGET_INGEST_TRACKS.length}]`;
    console.log(`\n${indexStr} Processing: "${track.title}" by ${track.artist}...`);

    try {
      // 1. Check if song already exists in Postgres to conserve precious API credits
      const normalizedTitle = track.title.toLowerCase().trim();
      const existing = await db
        .select()
        .from(songs)
        .where(eq(songs.title, track.title))
        .limit(1);

      if (existing.length > 0 && existing[0].bpm && existing[0].musicalKey) {
        console.log(`✨ Cached copy already present (BPM: ${existing[0].bpm}, Key: ${existing[0].musicalKey}). Skipping.`);
        skippedCount++;
        continue;
      }

      // 2. Search iTunes
      console.log("🔍 Querying iTunes Search API...");
      const queryStr = `${track.artist} ${track.title}`;
      const itunesSongs = await searchITunesSongs(queryStr, 3);
      if (itunesSongs.length === 0) {
        console.warn("⚠️ No matches found on iTunes.");
        failCount++;
        continue;
      }

      const bestItunes = itunesSongs.find(
        (s) =>
          s.artistName.toLowerCase().includes(track.artist.toLowerCase()) ||
          track.artist.toLowerCase().includes(s.artistName.toLowerCase())
      ) || itunesSongs[0];

      // 3. Resolve iTunes ID to MusicBrainz MBID
      console.log(`🔗 Resolving iTunes track ID ${bestItunes.trackId} to MusicBrainz MBID...`);
      const mbid = await resolveItunesToMbid(
        bestItunes.trackId.toString(),
        bestItunes.artistName,
        bestItunes.trackName,
        bestItunes.artworkUrl100,
        bestItunes.trackTimeMillis,
        bestItunes.previewUrl,
        bestItunes.collectionName
      );

      if (!mbid) {
        console.warn("⚠️ Could not resolve track to a MusicBrainz MBID.");
        failCount++;
        continue;
      }
      console.log(`✅ Resolved MBID: ${mbid}`);

      // 4. Fetch MusicBrainz recording structure
      console.log("🎼 Fetching recording credits and sample maps from MusicBrainz...");
      const recording = await getRecordingWithRels(mbid);
      const artist = recording["artist-credit"]?.map((ac) => ac.name).join(", ") ?? bestItunes.artistName;
      const title = recording.title;
      const bestRelease = selectBestRelease(recording.releases ?? []);
      const albumTitle = bestRelease?.title ?? null;
      const albumMbid = bestRelease?.id ?? null;
      const releaseDate = bestRelease?.date ?? null;
      const durationMs = recording.length ?? bestItunes.trackTimeMillis;
      const credits = extractCredits(recording.relations ?? []);
      const sampleRelationships = extractSamples(recording.relations ?? []);

      // 5. Query FreqBlog audio analysis with connection holding wait
      console.log("🎛️ Fetching harmonic features from FreqBlog analyzer (holding connection)...");
      const provider = createProvider();
      const audioFeatures = await provider.getFeatures({
        mbid,
        artist: bestItunes.artistName,
        title: bestItunes.trackName,
      });

      if (!audioFeatures || audioFeatures.status === "queued") {
        console.log("⏳ Harmonic analysis is currently queued in FreqBlog. Skipping complete cache compile for now.");
        // Sleep between records to preserve standard rate-limiting
        await sleep(1500);
        continue;
      }

      console.log(`🎵 Features Fetched! BPM: ${Math.round(audioFeatures.bpm!)}, Key: ${audioFeatures.camelot || audioFeatures.key}`);

      // 6. Fetch Cover Art
      console.log("🖼️ Retrieving primary and fallback album artwork...");
      const coverArtUrl = albumMbid
        ? await getCoverArt(albumMbid).then((caaUrl) => {
            if (caaUrl) return caaUrl;
            return bestItunes.artworkUrl100 ? bestItunes.artworkUrl100.replace("/100x100bb.jpg", "/600x600bb.jpg") : null;
          })
        : (bestItunes.artworkUrl100 ? bestItunes.artworkUrl100.replace("/100x100bb.jpg", "/600x600bb.jpg") : null);

      // 7. Parallel fetch other endpoints (lyrics & credits)
      console.log("⚡ Retrieving lyrics & physical Discogs catalogs...");
      const [lyricsResult, discogsEnrichment] = await Promise.all([
        getLyrics(artist, title),
        albumTitle ? getDiscogsCredits(artist, albumTitle, title) : Promise.resolve(null),
      ]);

      // 8. Compile and Commit cache song entry
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
        bpm: audioFeatures.bpm ? Math.round(audioFeatures.bpm) : null,
        musicalKey: audioFeatures.key ?? null,
        audioFeatures,
        credits,
        sampleRelationships,
        discogsEnrichment: discogsEnrichment ?? null,
        metadata: {},
      };

      console.log("💾 Writing compiled song record to PostgreSQL...");
      await cacheSong(songData);
      console.log(`🎉 Success! Saved "${title}" into cache.`);
      successCount++;

    } catch (err) {
      console.error(`❌ Unexpected error processing "${track.title}":`, err);
      failCount++;
    }

    // Gentle throttling sleep (1.5 seconds) to be a polite API client
    console.log("😴 Cooling down before next request...");
    await sleep(1500);
  }

  console.log("\n=========================================");
  console.log("🏁 COGNITIVE CACHE WARMER COMPLETED 🏁");
  console.log("=========================================");
  console.log(`✨ Total Successful Ingestions: ${successCount}`);
  console.log(`⏭️ Total Skipped (Already Cached): ${skippedCount}`);
  console.log(`❌ Total Failures: ${failCount}`);
  console.log("=========================================\n");
}

main().catch((err) => {
  console.error("FATAL CRASH IN CACHE WARMER:", err);
  process.exit(1);
});
