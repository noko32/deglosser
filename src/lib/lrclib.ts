const LRCLIB_BASE = "https://lrclib.net/api";
const USER_AGENT = "Deglosser/0.1.0 (https://github.com/noko32/deglosser)";

export interface LrclibResult {
  plainLyrics: string | null;
  syncedLyrics: string | null;
  duration: number | null;
  albumName: string | null;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function isCloseMatch(query: string, candidate: string): boolean {
  const q = normalize(query);
  const c = normalize(candidate);
  return q.length > 0 && c.length > 0 && (c.includes(q) || q.includes(c));
}

async function getExactLyrics(
  artist: string,
  title: string
): Promise<LrclibResult | null> {
  const params = new URLSearchParams({
    track_name: title,
    artist_name: artist,
  });

  try {
    const res = await fetch(`${LRCLIB_BASE}/get?${params}`, {
      headers: { "User-Agent": USER_AGENT },
    });

    if (!res.ok) return null;

    const data = await res.json();
    return {
      plainLyrics: data.plainLyrics ?? null,
      syncedLyrics: data.syncedLyrics ?? null,
      duration: data.duration ?? null,
      albumName: data.albumName ?? null,
    };
  } catch {
    return null;
  }
}

async function searchLyrics(
  artist: string,
  title: string
): Promise<LrclibResult | null> {
  const q = `${artist} ${title}`;

  try {
    const res = await fetch(
      `${LRCLIB_BASE}/search?q=${encodeURIComponent(q)}`,
      { headers: { "User-Agent": USER_AGENT } }
    );

    if (!res.ok) return null;

    const results: Array<{
      artistName: string;
      trackName: string;
      plainLyrics: string | null;
      syncedLyrics: string | null;
      duration: number | null;
      albumName: string | null;
    }> = await res.json();

    const match = results.find(
      (r) =>
        r.plainLyrics &&
        isCloseMatch(artist, r.artistName) &&
        isCloseMatch(title, r.trackName)
    );

    if (!match) return null;

    return {
      plainLyrics: match.plainLyrics ?? null,
      syncedLyrics: match.syncedLyrics ?? null,
      duration: match.duration ?? null,
      albumName: match.albumName ?? null,
    };
  } catch {
    return null;
  }
}

export async function getLyrics(
  artist: string,
  title: string
): Promise<LrclibResult | null> {
  const exact = await getExactLyrics(artist, title);
  if (exact) return exact;
  return searchLyrics(artist, title);
}
