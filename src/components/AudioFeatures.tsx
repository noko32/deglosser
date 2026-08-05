"use client";

import type { AudioFeaturesResult } from "@/lib/types";
import { useState, useEffect, useRef } from "react";

function Badge({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="panel px-3 py-2 text-center min-w-[60px] sm:min-w-[80px]">
      <p className="text-xs text-dg-text-muted uppercase tracking-wide">
        {label}
      </p>
      <p className="text-lg font-semibold text-dg-text mt-0.5">{value}</p>
      {subtitle && (
        <p className="text-[10px] text-dg-text-muted mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}

function BarBadge({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const pct = Math.round(value * 100);
  return (
    <div className="panel px-3 py-2 min-w-[70px] sm:min-w-[100px]">
      <p className="text-xs text-dg-text-muted uppercase tracking-wide">
        {label}
      </p>
      <div className="mt-1.5 h-1.5 rounded-full bg-dg-surface-elevated overflow-hidden">
        <div
          className="h-full rounded-full bg-dg-accent-blue"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-dg-text-muted mt-1 text-right">{pct}%</p>
    </div>
  );
}

// Spectrogram Curtain Loader (Living sound wave simulator)
function SpectrogramCurtain() {
  const barCount = 18;
  const bars = Array.from({ length: barCount });

  return (
    <div className="relative py-6 overflow-hidden rounded bg-dg-surface-elevated/20 border border-dg-accent-blue/10 flex flex-col items-center justify-center min-h-[140px]">
      {/* Dynamic inline keyframes style block for self-contained, high-performance height animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes soundWave {
          0%, 100% { height: 12px; opacity: 0.3; }
          50% { height: 48px; opacity: 0.95; }
        }
        .spectrogram-bar {
          animation: soundWave 1.2s ease-in-out infinite;
          background: linear-gradient(180deg, var(--dg-accent-blue), var(--dg-accent-violet));
          width: 4px;
        }
      `}} />

      <div className="flex items-end justify-center gap-1.5 h-12">
        {bars.map((_, i) => {
          // Stagger the animation delays and durations to simulate a rich complex spectrogram pulse
          const duration = 0.8 + Math.sin(i * 1.5) * 0.4;
          const delay = i * 0.08;
          return (
            <div
              key={i}
              className="spectrogram-bar rounded-full"
              style={{
                animationDuration: `${duration.toFixed(2)}s`,
                animationDelay: `${delay.toFixed(2)}s`,
              }}
            />
          );
        })}
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm font-semibold text-dg-text tracking-wide animate-pulse">
          Analyzing Audio Features
        </p>
        <p className="text-xs text-dg-text-muted mt-0.5">
          Crawling streaming services to run harmonic frequency analysis...
        </p>
      </div>
    </div>
  );
}

interface AudioFeaturesProps {
  features: AudioFeaturesResult | null;
  mbid?: string;
  artist?: string;
  title?: string;
}

export function AudioFeatures({
  features: initialFeatures,
  mbid,
  artist,
  title,
}: AudioFeaturesProps) {
  const [features, setFeatures] = useState<AudioFeaturesResult | null>(initialFeatures);
  const [polling, setPolling] = useState(initialFeatures?.status === "queued");
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // If initially queued, start client-side polling!
    if (polling && mbid && artist && title) {
      const poll = async () => {
        try {
          const params = new URLSearchParams({ mbid, artist, title });
          const res = await fetch(`/api/features/poll?${params}`);
          if (!res.ok) return;

          const data = await res.json();
          if (data.status === "success" && data.features) {
            setFeatures(data.features);
            setPolling(false);
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          }
        } catch (err) {
          console.error("Failed to poll audio features:", err);
        }
      };

      // Poll every 3.5 seconds to give FreqBlog queue ample breathing room
      pollTimerRef.current = setInterval(poll, 3500);
      
      // Execute an immediate initial poll in case FreqBlog has already finished
      poll();
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [polling, mbid, artist, title]);

  if (polling) {
    return <SpectrogramCurtain />;
  }

  if (!features) {
    return (
      <div className="panel p-4 text-center py-6 border border-dg-text-muted/10">
        <h2 className="text-xs font-medium text-dg-text-muted uppercase tracking-wide mb-1">
          Audio Features
        </h2>
        <p className="text-sm text-dg-text-secondary">Audio features unavailable for this track</p>
      </div>
    );
  }

  const hasSomething =
    features.bpm != null ||
    features.key != null ||
    features.energy != null;

  if (!hasSomething) {
    return (
      <div className="panel p-4 text-center py-6 border border-dg-text-muted/10">
        <h2 className="text-xs font-medium text-dg-text-muted uppercase tracking-wide mb-1">
          Audio Features
        </h2>
        <p className="text-sm text-dg-text-secondary">No key, BPM, or mood tags generated yet.</p>
      </div>
    );
  }

  return (
    <div className="panel p-4 transition-all duration-700 ease-out animate-[fadeIn_0.5s_ease-out]">
      <h2 className="text-sm font-medium text-dg-accent-violet uppercase tracking-wide mb-3">
        Audio Features
      </h2>

      <div className="flex flex-wrap gap-2">
        {features.bpm != null && (
          <Badge
            label="BPM"
            value={Math.round(features.bpm).toString()}
            subtitle={
              features.bpmAlt
                ? `alt: ${Math.round(features.bpmAlt)}`
                : undefined
            }
          />
        )}

        {features.key && (
          <Badge
            label="Key"
            value={features.key}
            subtitle={features.camelot ?? undefined}
          />
        )}

        {features.mood && (
          <Badge label="Mood" value={features.mood} />
        )}

        {features.genre && (
          <Badge label="Genre" value={features.genre} />
        )}

        {features.energy != null && (
          <BarBadge label="Energy" value={features.energy} />
        )}

        {features.danceability != null && (
          <BarBadge label="Danceability" value={features.danceability} />
        )}

        {features.valence != null && (
          <BarBadge label="Valence" value={features.valence} />
        )}
      </div>

      <p className="text-[10px] text-dg-text-muted mt-3 italic">
        Audio features are estimated via algorithmic analysis
      </p>
    </div>
  );
}
