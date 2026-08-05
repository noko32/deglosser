"use client";

import Image from "next/image";
import { useState } from "react";
import { GenerativeHarmonicCover } from "./GenerativeHarmonicCover";

export function CoverArt({
  src,
  alt,
  title,
  artist,
  musicalKey = null,
  bpm = null,
  mood = null,
}: {
  src: string | null;
  alt: string;
  title?: string;
  artist?: string;
  musicalKey?: string | null;
  bpm?: number | null;
  mood?: string | null;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Parse details from alt tag if title and artist aren't explicitly passed
  const resolvedTitle = title || alt.replace(" cover art", "").split(" by ")[0] || "Track";
  const resolvedArtist = artist || alt.replace(" cover art", "").split(" by ")[1] || "Unknown Artist";

  if (!src || error) {
    return (
      <GenerativeHarmonicCover
        title={resolvedTitle}
        artist={resolvedArtist}
        musicalKey={musicalKey}
        bpm={bpm}
        mood={mood}
        size="xl"
      />
    );
  }

  return (
    <div className="relative w-full max-w-[200px] aspect-square rounded-lg shrink-0 overflow-hidden">
      {!loaded && (
        <div className="absolute inset-0 bg-dg-surface-elevated animate-pulse rounded-lg" />
      )}
      <Image
        src={src}
        alt={alt}
        width={200}
        height={200}
        className={`w-full h-full object-cover rounded-lg shadow-lg transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        priority
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}
