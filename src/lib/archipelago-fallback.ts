export interface FallbackMetadata {
  bpm: number;
  musicalKey: string;
  isEstimated: boolean;
}

/**
 * Ensures BPM and musicalKey always exist for the always-on canvas.
 * Returns original values when present; safe defaults (120 BPM, 12A) when not.
 * The `isEstimated` flag lets the UI show an honest "estimated" badge
 * and tells the recommendations API to widen its tolerance.
 */
export function resolveArchipelagoMetadata(
  bpm: number | null,
  musicalKey: string | null
): FallbackMetadata {
  const hasBpm = bpm !== null && bpm > 0;
  const hasKey = musicalKey !== null && musicalKey.trim().length > 0;

  return {
    bpm: hasBpm ? bpm : 120,
    musicalKey: hasKey ? musicalKey! : "12A",
    isEstimated: !hasBpm || !hasKey,
  };
}
