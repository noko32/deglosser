"use client";

import Image from "next/image";
import { useState } from "react";

function ThumbPlaceholder() {
  return (
    <div className="w-12 h-12 rounded shrink-0 overflow-hidden relative">
      <div
        className="absolute inset-0 opacity-25"
        style={{
          background:
            "linear-gradient(135deg, var(--dg-accent-blue), var(--dg-accent-violet))",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-dg-text-muted">
          <path fillRule="evenodd" d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.756.122z" clipRule="evenodd" />
        </svg>
      </div>
    </div>
  );
}

export function SearchResultThumb({ releaseMbid }: { releaseMbid: string | null }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!releaseMbid || error) {
    return <ThumbPlaceholder />;
  }

  return (
    <div className="w-12 h-12 rounded shrink-0 overflow-hidden relative">
      {!loaded && (
        <div className="absolute inset-0 bg-dg-surface-elevated animate-pulse rounded" />
      )}
      <Image
        src={`https://coverartarchive.org/release/${releaseMbid}/front-250`}
        alt=""
        width={48}
        height={48}
        className={`w-12 h-12 object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}
