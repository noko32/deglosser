export const PRESENCE_SIDES = 12 as const;
export const PRESENCE_VIRTUAL = 400 as const;

export type PresenceSurface = "home" | "search" | "none";

export type MelomanoBrandSize = "hero" | "nav";

export interface PresenceNetTuning {
  scaleNet: number;
  glassAlpha: number;
}

export const DEFAULT_NET_TUNING: PresenceNetTuning = {
  scaleNet: 1.45,
  glassAlpha: 0.42,
};

export function presenceSurfaceFromPath(pathname: string): PresenceSurface {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/search")) return "search";
  return "none";
}

export function polar(
  cx: number,
  cy: number,
  r: number,
  i: number,
  n: number,
  rot = -Math.PI / 2
): [number, number] {
  const a = rot + (i / n) * Math.PI * 2;
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
}

export function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { d: number; sx: number; sy: number; t: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const sx = x1 + t * dx;
  const sy = y1 + t * dy;
  return { d: Math.hypot(px - sx, py - sy), sx, sy, t };
}
