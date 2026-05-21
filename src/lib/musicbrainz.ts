const MB_BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT = "Deglosser/0.1.0 (https://github.com/noko32/deglosser)";

export interface MBRecording {
  id: string;
  title: string;
  length: number | null;
  artistCredit: { name: string; id: string }[];
  firstReleaseDate: string | null;
  releases: {
    id: string;
    title: string;
    date: string | null;
    releaseGroup: { primaryType: string | null };
  }[];
}

export interface MBSearchResult {
  recordings: MBRecording[];
  count: number;
}

interface RawMBRecording {
  id: string;
  title: string;
  length?: number;
  "artist-credit"?: { name: string; artist: { id: string; name: string } }[];
  "first-release-date"?: string;
  releases?: {
    id: string;
    title: string;
    date?: string;
    "release-group"?: { "primary-type"?: string };
  }[];
}

let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 1100) {
    await new Promise((r) => setTimeout(r, 1100 - elapsed));
  }
  lastRequestTime = Date.now();

  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`MusicBrainz API error: ${res.status} ${res.statusText}`);
  }

  return res;
}

export async function searchRecordings(
  query: string,
  limit = 10
): Promise<MBSearchResult> {
  const encoded = encodeURIComponent(query);
  const url = `${MB_BASE}/recording/?query=${encoded}&fmt=json&limit=${limit}`;
  const res = await rateLimitedFetch(url);
  const data = await res.json();

  const recordings: MBRecording[] = (data.recordings || []).map(
    (r: RawMBRecording) => ({
      id: r.id,
      title: r.title,
      length: r.length ?? null,
      artistCredit: (r["artist-credit"] || []).map((ac) => ({
        name: ac.name,
        id: ac.artist.id,
      })),
      firstReleaseDate: r["first-release-date"] ?? null,
      releases: (r.releases || []).map((rel) => ({
        id: rel.id,
        title: rel.title,
        date: rel.date ?? null,
        releaseGroup: {
          primaryType: rel["release-group"]?.["primary-type"] ?? null,
        },
      })),
    })
  );

  return { recordings, count: data.count ?? 0 };
}

export async function getRecordingWithRels(mbid: string) {
  const url = `${MB_BASE}/recording/${mbid}?inc=artist-credits+releases+work-rels&fmt=json`;
  const res = await rateLimitedFetch(url);
  return res.json();
}

export async function getWorkCredits(workId: string) {
  const url = `${MB_BASE}/work/${workId}?inc=artist-rels&fmt=json`;
  const res = await rateLimitedFetch(url);
  return res.json();
}
