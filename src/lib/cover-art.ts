const CAA_BASE = "https://coverartarchive.org";

interface ITunesCoverSearchHit {
  artistName?: string;
  artworkUrl100?: string;
}

export async function getCoverArt(
  releaseMbid: string
): Promise<string | null> {
  try {
    const res = await fetch(`${CAA_BASE}/release/${releaseMbid}`, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const front = data.images?.find(
      (img: { front: boolean }) => img.front === true
    );

    const url = front?.thumbnails?.["500"] ?? front?.thumbnails?.large ?? null;
    return url?.replace("http://", "https://") ?? null;
  } catch {
    return null;
  }
}

/**
 * Robust alternative cover art retriever
 * Searches iTunes Search API first (for high-res 600x600 covers),
 * then falls back to Discogs API database search if iTunes yields no results.
 */
export async function getAlternativeCoverArt(
  artist: string,
  title: string,
  albumTitle?: string | null
): Promise<string | null> {
  // 1. Try iTunes Search API (fast, free, high quality)
  try {
    const term = albumTitle ? `${artist} ${albumTitle}` : `${artist} ${title}`;
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=3`;
    
    const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      const data = await res.json();
      const results = (data.results || []) as ITunesCoverSearchHit[];
      
      // Look for best match matching the artist
      const bestMatch = results.find((song) => {
        const songArtist = song.artistName?.toLowerCase() ?? "";
        const queryArtist = artist.toLowerCase();
        return songArtist.includes(queryArtist) || queryArtist.includes(songArtist);
      }) || results[0];

      if (bestMatch?.artworkUrl100) {
        return bestMatch.artworkUrl100.replace("/100x100bb.jpg", "/600x600bb.jpg");
      }
    }
  } catch (err) {
    console.error("iTunes alternative cover fetch failed:", err);
  }

  // 2. Try Discogs API database search as a secondary fallback
  try {
    const token = process.env.DISCOGS_TOKEN;
    if (token) {
      const query = albumTitle ? `${artist} - ${albumTitle}` : `${artist} - ${title}`;
      const url = `https://api.discogs.com/database/search?q=${encodeURIComponent(query)}&type=release&per_page=1`;
      
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Melomano/1.0.0 (https://github.com/noko32/deglosser)",
          Accept: "application/json",
          Authorization: `Discogs token=${token}`,
        },
        signal: AbortSignal.timeout(1500),
      });

      if (res.ok) {
        const data = await res.json();
        const firstResult = data.results?.[0];
        if (firstResult?.cover_image) {
          return firstResult.cover_image;
        }
      }
    }
  } catch (err) {
    console.error("Discogs alternative cover fetch failed:", err);
  }

  return null;
}
