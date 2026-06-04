import type { DiscogsEnrichment, DiscogsCredit } from "./types";

const DISCOGS_BASE = "https://api.discogs.com";
const USER_AGENT = "Melomano/1.0.0 (https://github.com/noko32/deglosser)";

export interface DiscogsExtraArtist {
  name: string;
  role: string;
  anv?: string;
}

export interface DiscogsTrack {
  position: string;
  title: string;
  duration?: string;
  extraartists?: DiscogsExtraArtist[];
}

interface DiscogsSearchResult {
  id: number;
  title: string;
  format?: string[];
  community?: { want: number; have: number };
  master_id?: number;
}

function buildHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "User-Agent": USER_AGENT,
    Accept: "application/json",
  };
  const token = process.env.DISCOGS_TOKEN;
  if (token) {
    headers.Authorization = `Discogs token=${token}`;
  }
  return headers;
}

export function matchesPhysicalFormat(formats: string[] | undefined): boolean {
  if (!formats) return false;
  return formats.some((f) =>
    ["vinyl", "cd", "lp", "cassette"].some((pf) =>
      f.toLowerCase().includes(pf)
    )
  );
}

export function normalizeTitle(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function findTrackInTracklist(
  tracklist: DiscogsTrack[],
  trackTitle: string
): DiscogsTrack | null {
  const normalized = normalizeTitle(trackTitle);
  return (
    tracklist.find((t) => normalizeTitle(t.title) === normalized) ??
    tracklist.find((t) => normalizeTitle(t.title).includes(normalized)) ??
    tracklist.find((t) => normalized.includes(normalizeTitle(t.title))) ??
    null
  );
}

export function mapCredits(extraartists: DiscogsExtraArtist[]): DiscogsCredit[] {
  return extraartists.map((ea) => ({
    name: ea.anv || ea.name,
    role: ea.role,
    ...(ea.anv ? { anv: ea.anv } : {}),
  }));
}

export async function getDiscogsCredits(
  artist: string,
  albumTitle: string,
  trackTitle: string
): Promise<DiscogsEnrichment | null> {
  const token = process.env.DISCOGS_TOKEN;
  if (!token) return null;

  try {
    // Search for the album (not the song — physical releases have credits)
    const searchParams = new URLSearchParams({
      q: albumTitle,
      type: "release",
      artist,
      per_page: "15",
    });
    const searchRes = await fetch(
      `${DISCOGS_BASE}/database/search?${searchParams}`,
      { headers: buildHeaders() }
    );
    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    const results: DiscogsSearchResult[] = searchData.results ?? [];

    // Pick best physical release: filter to Vinyl/CD, prefer highest community.have
    const physicalReleases = results.filter((r) =>
      matchesPhysicalFormat(r.format)
    );
    const candidates =
      physicalReleases.length > 0 ? physicalReleases : results;
    if (candidates.length === 0) return null;

    candidates.sort(
      (a, b) => (b.community?.have ?? 0) - (a.community?.have ?? 0)
    );
    const bestRelease = candidates[0];

    // Fetch full release
    const releaseRes = await fetch(
      `${DISCOGS_BASE}/releases/${bestRelease.id}`,
      { headers: buildHeaders() }
    );
    if (!releaseRes.ok) return null;

    const release = await releaseRes.json();

    const releaseCredits = mapCredits(release.extraartists ?? []);

    // Find matching track and extract per-track credits
    const matchedTrack = findTrackInTracklist(
      release.tracklist ?? [],
      trackTitle
    );
    const trackCredits = matchedTrack
      ? mapCredits(matchedTrack.extraartists ?? [])
      : [];

    return {
      releaseCredits,
      trackCredits,
      genres: release.genres ?? [],
      styles: release.styles ?? [],
      labels: (release.labels ?? []).map(
        (l: { name: string }) => l.name
      ),
    };
  } catch {
    return null;
  }
}
