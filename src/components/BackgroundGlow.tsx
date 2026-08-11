"use client";

import { usePathname } from "next/navigation";
import { presenceSurfaceFromPath } from "@/lib/presence";

const presets: Record<string, string> = {
  home: [
    "radial-gradient(60% 50% at 25% 10%, oklch(50% 0.16 300 / 0.30) 0%, transparent 70%)",
    "radial-gradient(55% 45% at 85% 45%, oklch(50% 0.15 260 / 0.35) 0%, transparent 70%)",
    "radial-gradient(50% 40% at 60% 100%, oklch(55% 0.13 85 / 0.22) 0%, transparent 70%)",
  ].join(", "),

  search: [
    "radial-gradient(55% 45% at 80% 5%, oklch(48% 0.14 220 / 0.30) 0%, transparent 70%)",
    "radial-gradient(50% 45% at 0% 60%, oklch(50% 0.12 180 / 0.25) 0%, transparent 70%)",
  ].join(", "),

  song: [
    "radial-gradient(55% 45% at 5% 5%, oklch(50% 0.15 260 / 0.35) 0%, transparent 70%)",
    "radial-gradient(50% 40% at 95% 15%, oklch(50% 0.16 300 / 0.30) 0%, transparent 70%)",
    "radial-gradient(50% 40% at 100% 55%, oklch(48% 0.14 280 / 0.28) 0%, transparent 70%)",
    "radial-gradient(50% 40% at 45% 100%, oklch(55% 0.15 85 / 0.25) 0%, transparent 70%)",
  ].join(", "),

  favorites: [
    "radial-gradient(55% 45% at 40% 5%, oklch(52% 0.16 350 / 0.30) 0%, transparent 70%)",
    "radial-gradient(45% 40% at 90% 50%, oklch(50% 0.14 320 / 0.25) 0%, transparent 70%)",
    "radial-gradient(50% 40% at 0% 95%, oklch(48% 0.12 280 / 0.22) 0%, transparent 70%)",
  ].join(", "),
};

function getPreset(pathname: string): string {
  if (pathname === "/") return presets.home;
  if (pathname.startsWith("/search")) return presets.search;
  if (pathname.startsWith("/song")) return presets.song;
  if (pathname.startsWith("/favorites")) return presets.favorites;
  return presets.home;
}

export function BackgroundGlow() {
  const pathname = usePathname();
  const surface = presenceSurfaceFromPath(pathname);
  const dimmed = surface === "home" || surface === "search";

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 -z-10 ${dimmed ? "opacity-45" : ""}`}
      style={{ backgroundImage: getPreset(pathname) }}
    />
  );
}
