"use client";

import React, { useMemo } from "react";
import { toCamelot } from "@/lib/key-converter";

interface GenerativeHarmonicCoverProps {
  title: string;
  artist: string;
  musicalKey: string | null;
  bpm: number | null;
  mood?: string | null;
  size?: "sm" | "md" | "lg" | "xl" | "fluid";
}

const HARMONIC_COLORS: Record<string, { base: string; secondary: string; text: string; name: string }> = {
  "1A": { base: "#E51E25", secondary: "#A01115", text: "#FFFFFF", name: "Ab-Minor" },
  "1B": { base: "#E51E25", secondary: "#F47D81", text: "#FFFFFF", name: "B-Major" },
  "2A": { base: "#EE5B23", secondary: "#9E340E", text: "#FFFFFF", name: "Eb-Minor" },
  "2B": { base: "#EE5B23", secondary: "#F59F7C", text: "#FFFFFF", name: "F#-Major" },
  "3A": { base: "#F69E1F", secondary: "#9F5F0B", text: "#000000", name: "Bb-Minor" },
  "3B": { base: "#F69E1F", secondary: "#FACB7D", text: "#000000", name: "Db-Major" },
  "4A": { base: "#FFDC00", secondary: "#A38600", text: "#000000", name: "F-Minor" },
  "4B": { base: "#FFDC00", secondary: "#FFEFA3", text: "#000000", name: "Ab-Major" },
  "5A": { base: "#8DC63F", secondary: "#578021", text: "#000000", name: "C-Minor" },
  "5B": { base: "#8DC63F", secondary: "#C5E692", text: "#000000", name: "Eb-Major" },
  "6A": { base: "#2C8338", secondary: "#144D1B", text: "#FFFFFF", name: "G-Minor" },
  "6B": { base: "#2C8338", secondary: "#7EC684", text: "#000000", name: "Bb-Major" },
  "7A": { base: "#00A757", secondary: "#005E26", text: "#FFFFFF", name: "D-Minor" },
  "7B": { base: "#00A757", secondary: "#6FE6A6", text: "#000000", name: "F-Major" },
  "8A": { base: "#00AEEF", secondary: "#006282", text: "#FFFFFF", name: "A-Minor" },
  "8B": { base: "#00AEEF", secondary: "#86E1FF", text: "#000000", name: "C-Major" },
  "9A": { base: "#1C46B1", secondary: "#0C2366", text: "#FFFFFF", name: "E-Minor" },
  "9B": { base: "#1C46B1", secondary: "#7D9DFA", text: "#000000", name: "G-Major" },
  "10A": { base: "#6F2C91", secondary: "#3C1252", text: "#FFFFFF", name: "B-Minor" },
  "10B": { base: "#6F2C91", secondary: "#C48EEA", text: "#FFFFFF", name: "D-Major" },
  "11A": { base: "#A6227B", secondary: "#5D0E52", text: "#FFFFFF", name: "F#-Minor" },
  "11B": { base: "#A6227B", secondary: "#EA8ECF", text: "#FFFFFF", name: "A-Major" },
  "12A": { base: "#E61578", secondary: "#8B0541", text: "#FFFFFF", name: "C#-Minor" },
  "12B": { base: "#E61578", secondary: "#FA85BF", text: "#FFFFFF", name: "E-Major" },
};

export function GenerativeHarmonicCover({
  title,
  artist,
  musicalKey,
  bpm,
  mood,
  size = "md",
}: GenerativeHarmonicCoverProps) {
  // 1. Resolve to Camelot representation
  const camelot = useMemo(() => {
    if (!musicalKey) return null;
    return toCamelot(musicalKey).toUpperCase().trim();
  }, [musicalKey]);

  // 2. Fetch Serato-aligned color profile for this key
  const colorProfile = useMemo(() => {
    if (camelot && HARMONIC_COLORS[camelot]) {
      return HARMONIC_COLORS[camelot];
    }
    // Deep premium fallback gradient if key is completely unknown
    return {
      base: "#2563EB", // Blue
      secondary: "#8B5CF6", // Violet
      text: "#FFFFFF",
      name: musicalKey || "Unknown",
    };
  }, [camelot, musicalKey]);

  // 3. Compute dynamic pulsing speed matching the real song BPM
  const pulseStyle = useMemo(() => {
    if (!bpm || bpm <= 0) return {};
    const secondsPerBeat = 60 / bpm;
    return {
      animationDuration: `${secondsPerBeat.toFixed(3)}s`,
    };
  }, [bpm]);

  // 4. Set up style classes and design dimensions
  const dims = useMemo(() => {
    switch (size) {
      case "fluid":
        return {
          container: "w-full h-full rounded-full",
          inner: "inset-[25%]",
          titleText: "hidden",
          metaText: "text-[8px]",
          grooves: "hidden",
        };
      case "sm":
        return {
          container: "w-10 h-10 sm:w-11 sm:h-11 rounded-full",
          inner: "inset-2",
          titleText: "hidden",
          metaText: "text-[8px]",
          grooves: "hidden",
        };
      case "md":
        return {
          container: "w-16 h-16 sm:w-20 sm:h-20 rounded-xl",
          inner: "inset-3.5",
          titleText: "text-[8px] leading-tight font-bold",
          metaText: "text-[9px] font-mono",
          grooves: "absolute inset-1 rounded-full border border-black/10 opacity-30",
        };
      case "lg":
        return {
          container: "w-28 h-28 sm:w-32 sm:h-32 rounded-2xl",
          inner: "inset-6",
          titleText: "text-[10px] leading-tight font-extrabold max-w-[80px]",
          metaText: "text-[11px] font-mono font-bold",
          grooves: "absolute inset-2 rounded-full border border-black/15 opacity-40",
        };
      case "xl":
      default:
        return {
          container: "w-full max-w-[200px] aspect-square rounded-2xl",
          inner: "inset-[42px]",
          titleText: "text-[12px] leading-tight font-extrabold max-w-[120px] tracking-tight",
          metaText: "text-xs font-mono font-bold",
          grooves: "absolute inset-4 rounded-full border border-black/20 opacity-50",
        };
    }
  }, [size]);

  // 5. Stylize based on Mood from FreqBlog if present
  const moodFilter = useMemo(() => {
    if (!mood) return "contrast-100 saturate-100";
    const m = mood.toLowerCase();
    if (m.includes("dark") || m.includes("sad") || m.includes("tense") || m.includes("melancholic")) {
      return "brightness-75 contrast-125 saturate-75 hue-rotate-15";
    }
    if (m.includes("happy") || m.includes("energetic") || m.includes("bright") || m.includes("warm")) {
      return "brightness-110 saturate-150 contrast-100 animate-[pulse_8s_infinite]";
    }
    return "contrast-100 saturate-100";
  }, [mood]);

  const initials = useMemo(() => {
    return title.slice(0, 2).toUpperCase();
  }, [title]);

  return (
    <div
      className={`relative overflow-hidden shrink-0 shadow-lg border border-white/5 flex items-center justify-center select-none group/gen-cover ${dims.container}`}
      style={{
        background: `radial-gradient(circle at 30% 30%, ${colorProfile.base}, ${colorProfile.secondary})`,
      }}
    >
      {/* Aurora Ambient Morph Overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent ${moodFilter}`}
        style={{
          mixBlendMode: "overlay",
        }}
      />

      {/* BPM Heartbeat Pulse Glow Ring (Pulsates in real-time synced to the track's BPM) */}
      {bpm && (
        <div
          className="absolute inset-0 border border-white/20 rounded-full scale-100 animate-[ping_1.5s_infinite] pointer-events-none opacity-0 group-hover/gen-cover:opacity-45"
          style={{
            animationDuration: pulseStyle.animationDuration || "1s",
            borderColor: colorProfile.base,
          }}
        />
      )}

      {/* Vinyl Grooves (subtle round record texture) */}
      <div className={dims.grooves} />
      {size !== "sm" && (
        <div
          className="absolute inset-4 rounded-full border border-black/5 opacity-20 pointer-events-none"
          style={{ transform: "rotate(45deg)" }}
        />
      )}

      {/* Center Record Label / Spindle Hub */}
      <div
        className={`absolute rounded-full flex flex-col items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),_0_2px_4px_rgba(0,0,0,0.2)] text-center p-1 bg-neutral-950/80 border border-white/10 text-white ${dims.inner}`}
      >
        {/* Track Title Initials */}
        {size === "sm" ? (
          <span className="text-[10px] font-black tracking-tight leading-none text-white/90">
            {initials}
          </span>
        ) : (
          <div className="flex flex-col items-center justify-center gap-0.5 w-full">
            <span
              className={`text-white font-black truncate max-w-full text-center ${dims.titleText}`}
              title={title}
            >
              {title}
            </span>
            <span className="text-[7px] text-neutral-400 font-medium truncate max-w-full block px-1 leading-none">
              {artist}
            </span>
          </div>
        )}

        {/* Floating Harmonic Data badge */}
        {size !== "sm" && (
          <div className="mt-1 flex flex-col items-center leading-none">
            {camelot && (
              <span
                className="font-mono text-[7px] font-extrabold uppercase px-1 rounded bg-white/10 tracking-widest text-neutral-200"
                style={{ color: colorProfile.base }}
              >
                {camelot}
              </span>
            )}
            {bpm && size !== "md" && (
              <span className="text-[6px] font-mono text-neutral-400 mt-0.5">
                {Math.round(bpm)} BPM
              </span>
            )}
          </div>
        )}
      </div>

      {/* Vinyl Spindle Center Hole */}
      <div className="absolute w-1.5 h-1.5 rounded-full bg-neutral-900 border border-neutral-800 shadow-inner z-10" />
    </div>
  );
}
