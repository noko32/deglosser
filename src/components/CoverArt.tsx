"use client";

import Image from "next/image";
import { useState } from "react";

export function CoverArt({
  src,
  alt,
}: {
  src: string | null;
  alt: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!src || error) {
    return <CoverArtPlaceholder />;
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

function CoverArtPlaceholder() {
  return (
    <div className="w-full max-w-[200px] aspect-square rounded-lg shrink-0 overflow-hidden relative">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            "linear-gradient(135deg, var(--dg-accent-blue), var(--dg-accent-violet))",
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-10 h-10 text-dg-text-muted"
        >
          <path
            fillRule="evenodd"
            d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.756.122z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-xs text-dg-text-muted">No artwork</span>
      </div>
    </div>
  );
}
