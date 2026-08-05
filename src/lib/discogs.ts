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

interface DiscogsReleaseVideo {
  title: string;
  uri: string;
  duration?: number;
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

/**
 * Secondary fallback to search for specific song/single releases directly on Discogs.
 * Essential when album-level searches fail to return video coordinates.
 */
async function getDiscogsTrackVideos(
  artist: string,
  trackTitle: string
): Promise<{ title: string; uri: string; duration: number }[]> {
  try {
    const searchParams = new URLSearchParams({
      q: `${artist} - ${trackTitle}`,
      type: "release",
      per_page: "8",
    });
    const res = await fetch(
      `${DISCOGS_BASE}/database/search?${searchParams}`,
      { headers: buildHeaders() }
    );
    if (!res.ok) return [];

    const data = await res.json();
    const results = data.results ?? [];
    if (results.length === 0) return [];

    const trackIsRemix = /\bremix\b|\bmix\b/i.test(trackTitle);
    const trackNorm = normalizeTitle(trackTitle);
    const ranked = [...results].sort((a, b) => {
      const scoreRelease = (r: DiscogsSearchResult) => {
        const t = `${r.title || ""}`.toLowerCase();
        const tNorm = normalizeTitle(r.title || "");
        let s = r.community?.have ?? 0;
        if (!trackIsRemix && /remix|a\.?\s*g\.?\s*cook|addison/i.test(t)) s -= 1000;
        if (trackNorm && tNorm.includes(trackNorm)) s += 80;
        return s;
      };
      return scoreRelease(b) - scoreRelease(a);
    });

    // Check top ranked releases for video attachments
    for (let i = 0; i < Math.min(ranked.length, 4); i++) {
      const releaseId = ranked[i].id;
      const releaseRes = await fetch(
        `${DISCOGS_BASE}/releases/${releaseId}`,
        { headers: buildHeaders() }
      );
      if (releaseRes.ok) {
        const release = await releaseRes.json();
        const videos = (release.videos ?? []) as DiscogsReleaseVideo[];
        if (videos.length > 0) {
          return videos.map((v) => ({
            title: v.title,
            uri: v.uri,
            duration: v.duration || 0,
          }));
        }
      }
    }
  } catch {
    // Ignore and fallback
  }
  return [];
}

export async function getDiscogsCredits(
  artist: string,
  albumTitle: string | null,
  trackTitle: string
): Promise<DiscogsEnrichment | null> {
  const token = process.env.DISCOGS_TOKEN;
  if (!token) return null;

  try {
    let releaseCredits: DiscogsCredit[] = [];
    let trackCredits: DiscogsCredit[] = [];
    let genres: string[] = [];
    let styles: string[] = [];
    let labels: string[] = [];
    let videos: { title: string; uri: string; duration: number }[] = [];

    // 1. Primary search: Look up the album release physical details if available
    if (albumTitle) {
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

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const results: DiscogsSearchResult[] = searchData.results ?? [];

        const physicalReleases = results.filter((r) =>
          matchesPhysicalFormat(r.format)
        );
        const candidates = physicalReleases.length > 0 ? physicalReleases : results;

        if (candidates.length > 0) {
          candidates.sort(
            (a, b) => (b.community?.have ?? 0) - (a.community?.have ?? 0)
          );
          const bestRelease = candidates[0];

          const releaseRes = await fetch(
            `${DISCOGS_BASE}/releases/${bestRelease.id}`,
            { headers: buildHeaders() }
          );

          if (releaseRes.ok) {
            const release = await releaseRes.json();
            releaseCredits = mapCredits(release.extraartists ?? []);
            genres = release.genres ?? [];
            styles = release.styles ?? [];
            labels = (release.labels ?? []).map((l: { name: string }) => l.name);
            videos = (release.videos ?? []).map(
              (v: { title: string; uri: string; duration: number }) => ({
                title: v.title,
                uri: v.uri,
                duration: v.duration,
              })
            );

            const matchedTrack = findTrackInTracklist(
              release.tracklist ?? [],
              trackTitle
            );
            if (matchedTrack) {
              trackCredits = mapCredits(matchedTrack.extraartists ?? []);
            }
          }
        }
      }
    }

    // 2. Secondary fallback: If no videos were found on the physical album, run direct track search
    if (videos.length === 0) {
      const fallbackVideos = await getDiscogsTrackVideos(artist, trackTitle);
      if (fallbackVideos.length > 0) {
        videos = fallbackVideos;
      }
    }

    return {
      releaseCredits,
      trackCredits,
      genres,
      styles,
      labels,
      videos,
    };
  } catch {
    return null;
  }
}
