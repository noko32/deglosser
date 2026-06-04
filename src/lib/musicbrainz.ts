import type {
  MBRecordingDetail,
  MBRelease,
  MBRelation,
  Credit,
  SampleRelationship,
} from "./types";

const MB_BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT = "Melomano/1.0.0 (https://github.com/noko32/deglosser)";

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

export function buildSearchQuery(raw: string): string {
  // "X by Y" pattern
  const byMatch = raw.match(/^(.+?)\s+by\s+(.+)$/i);
  if (byMatch) {
    return `recording:${byMatch[1].trim()} AND artist:${byMatch[2].trim()}`;
  }
  // "Artist - Title" pattern
  const dashMatch = raw.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (dashMatch) {
    return `recording:${dashMatch[2].trim()} AND artist:${dashMatch[1].trim()}`;
  }
  // Multi-word without separator: last word as artist, rest as recording
  const words = raw.trim().split(/\s+/);
  if (words.length >= 2) {
    const artist = words[words.length - 1];
    const title = words.slice(0, -1).join(" ");
    return `recording:${title} AND artist:${artist}`;
  }
  return raw;
}

export async function searchRecordings(
  query: string,
  limit = 10,
  offset = 0
): Promise<MBSearchResult> {
  const luceneQuery = buildSearchQuery(query);
  const encoded = encodeURIComponent(luceneQuery);
  const url = `${MB_BASE}/recording/?query=${encoded}&fmt=json&limit=${limit}&offset=${offset}`;
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

const ENRICHED_INC = [
  "artist-credits",
  "releases",
  "release-groups",
  "work-rels",
  "artist-rels",
  "work-level-rels",
  "recording-rels",
].join("+");

export async function getRecordingWithRels(
  mbid: string
): Promise<MBRecordingDetail> {
  const url = `${MB_BASE}/recording/${mbid}?inc=${ENRICHED_INC}&fmt=json`;
  const res = await rateLimitedFetch(url);
  return res.json();
}

/**
 * Pick the best release: prefer Album (non-compilation), then earliest date.
 */
export function selectBestRelease(
  releases: MBRelease[]
): MBRelease | null {
  if (releases.length === 0) return null;

  const albums = releases.filter((r) => {
    const rg = r["release-group"];
    if (!rg) return false;
    const primary = rg["primary-type"];
    const secondary = rg["secondary-types"] ?? [];
    return (
      primary === "Album" &&
      !secondary.includes("Compilation") &&
      !secondary.includes("DJ-mix")
    );
  });

  const candidates = albums.length > 0 ? albums : releases;

  candidates.sort((a, b) => {
    const dateA = a.date ?? "9999";
    const dateB = b.date ?? "9999";
    return dateA.localeCompare(dateB);
  });

  return candidates[0];
}

/**
 * Extract credits from work-level-rels and recording-level artist-rels.
 */
export function extractCredits(relations: MBRelation[]): Credit[] {
  const credits: Credit[] = [];

  for (const rel of relations) {
    // Recording-level artist rels (producer, mix, etc.)
    if (rel["target"] && rel.artist && rel.type) {
      credits.push({
        name: rel.artist.name,
        role: rel.type,
        source: "musicbrainz",
      });
    }

    // Work-level rels (nested inside work relations)
    if (rel.work?.relations) {
      for (const workRel of rel.work.relations) {
        if (workRel.artist) {
          credits.push({
            name: workRel.artist.name,
            role: workRel.type,
            source: "musicbrainz",
          });
        }
      }
    }
  }

  // Deduplicate by name+role
  const seen = new Set<string>();
  return credits.filter((c) => {
    const key = `${c.name}::${c.role}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Extract sample relationships from recording-rels.
 */
export function extractSamples(
  relations: MBRelation[]
): SampleRelationship[] {
  return relations
    .filter((rel) => rel.type === "samples material" && rel.recording)
    .map((rel) => ({
      title: rel.recording!.title,
      artist:
        rel.recording!["artist-credit"]
          ?.map((ac) => ac.name)
          .join(", ") ?? "Unknown",
      mbid: rel.recording!.id,
      direction:
        rel.direction === "forward"
          ? ("samples" as const)
          : ("sampled_by" as const),
    }));
}
