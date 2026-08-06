import { getRecordingWithRels, selectBestRelease } from "./musicbrainz";

/** Minimum score required before we trust an iTunes → MBID mapping */
export const MIN_RESOLUTION_SCORE = 45;

/** Best candidate must beat the runner-up by at least this much */
export const MIN_SCORE_GAP = 12;

/**
 * When iTunes album title ≠ MB best release, allow through if duration
 * is this close (same-recording evidence for compilation packaging).
 */
export const DURATION_ALBUM_BYPASS_MS = 2000;

const BAD_RELEASE_RE =
  /boiler room|partygirl|dj mix|live at|karaoke|tribute|workout|greatest hits|now that's what|spotify/i;

export function normalizeMappingKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export function albumsCompatible(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return true;
  const na = normalizeMappingKey(a);
  const nb = normalizeMappingKey(b);
  if (!na || !nb) return true;
  return na === nb || na.includes(nb) || nb.includes(na);
}

export function isSuspiciousReleaseTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  return BAD_RELEASE_RE.test(title);
}

export interface ResolutionCandidate {
  id: string;
  title: string;
  length: number | null;
  artistCredit: { name: string }[];
  releases: { title: string; releaseGroup: { primaryType: string | null } }[];
}

/**
 * Score how well a MusicBrainz recording matches an iTunes search click.
 * Exported for unit tests.
 */
export function scoreMbRecording(
  recording: ResolutionCandidate,
  artist: string,
  title: string,
  album?: string,
  durationMs?: number
): number {
  let score = 0;
  const titleNorm = normalizeMappingKey(title);
  const recTitleNorm = normalizeMappingKey(recording.title);
  const artistNorm = normalizeMappingKey(primaryArtist(artist));
  const recArtistNorm = normalizeMappingKey(
    primaryArtist(recording.artistCredit.map((a) => a.name).join(", ") || "")
  );

  if (recTitleNorm === titleNorm) score += 40;
  else if (recTitleNorm.includes(titleNorm) || titleNorm.includes(recTitleNorm)) score += 15;

  if (recArtistNorm === artistNorm) score += 25;
  else if (recArtistNorm.includes(artistNorm) || artistNorm.includes(recArtistNorm)) score += 10;

  const albumNorm = album ? normalizeMappingKey(album) : "";
  if (albumNorm) {
    for (const rel of recording.releases || []) {
      const relNorm = normalizeMappingKey(rel.title);
      if (relNorm === albumNorm) score += 80;
      else if (relNorm.includes(albumNorm) || albumNorm.includes(relNorm)) score += 40;
      if (rel.releaseGroup?.primaryType === "Album") score += 8;
    }
  }

  const releaseBlob = (recording.releases || []).map((r) => r.title).join(" ");
  const userChoseSuspiciousAlbum =
    album &&
    (recording.releases || []).some(
      (rel) =>
        albumsCompatible(album, rel.title) && isSuspiciousReleaseTitle(rel.title)
    );
  if (isSuspiciousReleaseTitle(releaseBlob) && !userChoseSuspiciousAlbum) {
    score -= 100;
  }
  if (/remix|mix\b/i.test(recording.title) && !/remix|mix\b/i.test(title)) score -= 50;

  if (durationMs && recording.length) {
    const delta = Math.abs(recording.length - durationMs);
    if (delta < 2000) score += 20;
    else if (delta < 5000) score += 10;
    else if (delta > 30000) score -= 15;
  }

  return score;
}

function primaryArtist(artistName: string): string {
  return artistName.split(/,|&| feat\.?| featuring| ft\.?/i)[0].trim();
}

export interface ResolutionQualityResult {
  ok: boolean;
  reason?: string;
  bestReleaseTitle?: string | null;
}

/**
 * After picking an MBID, fetch the recording and verify the best release
 * aligns with the iTunes album context (guards against PARTYGIRL-style mismatches).
 */
export async function verifyMbidMatchesContext(
  mbid: string,
  artist: string,
  title: string,
  album?: string | null,
  durationMs?: number
): Promise<ResolutionQualityResult> {
  try {
    const recording = await getRecordingWithRels(mbid);
    const bestRelease = selectBestRelease(recording.releases ?? [], album);

    if (album && bestRelease?.title) {
      if (!albumsCompatible(album, bestRelease.title)) {
        // iTunes compilations often aren't on MB; near-identical duration
        // is enough same-recording evidence (PARTYGIRL-scale deltas still fail).
        const durationOk =
          durationMs != null &&
          recording.length != null &&
          Math.abs(recording.length - durationMs) < DURATION_ALBUM_BYPASS_MS;
        if (!durationOk) {
          return {
            ok: false,
            reason: `release_mismatch:${bestRelease.title}`,
            bestReleaseTitle: bestRelease.title,
          };
        }
      }
    }

    if (isSuspiciousReleaseTitle(bestRelease?.title)) {
      const userChoseThisRelease =
        !!album && albumsCompatible(album, bestRelease?.title);
      if (!userChoseThisRelease) {
        return {
          ok: false,
          reason: `suspicious_release:${bestRelease?.title}`,
          bestReleaseTitle: bestRelease?.title ?? null,
        };
      }
    }

    const score = scoreMbRecording(
      {
        id: recording.id,
        title: recording.title,
        length: recording.length ?? null,
        artistCredit: (recording["artist-credit"] ?? []).map((ac) => ({
          name: ac.name,
        })),
        releases: (recording.releases ?? []).map((r) => ({
          title: r.title,
          releaseGroup: {
            primaryType: r["release-group"]?.["primary-type"] ?? null,
          },
        })),
      },
      artist,
      title,
      album ?? undefined,
      durationMs
    );

    if (score < MIN_RESOLUTION_SCORE) {
      return {
        ok: false,
        reason: `low_confidence:${score}`,
        bestReleaseTitle: bestRelease?.title ?? null,
      };
    }

    return { ok: true, bestReleaseTitle: bestRelease?.title ?? null };
  } catch {
    return { ok: false, reason: "verification_fetch_failed" };
  }
}

export function pickBestRecording(
  recordings: ResolutionCandidate[],
  artist: string,
  title: string,
  album?: string,
  durationMs?: number
): { mbid: string | null; score: number; gap: number } {
  if (recordings.length === 0) return { mbid: null, score: 0, gap: 0 };

  const ranked = [...recordings]
    .map((r) => ({ id: r.id, score: scoreMbRecording(r, artist, title, album, durationMs) }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  const second = ranked[1];
  const gap = second ? best.score - second.score : best.score;

  if (best.score < MIN_RESOLUTION_SCORE || gap < MIN_SCORE_GAP) {
    return { mbid: null, score: best.score, gap };
  }

  return { mbid: best.id, score: best.score, gap };
}
