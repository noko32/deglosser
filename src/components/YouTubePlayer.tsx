"use client";

import { useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import type { DiscogsVideo } from "@/lib/types";

interface YouTubePlayerProps {
  videos?: DiscogsVideo[];
  queryFallback?: string;
}

function getYouTubeId(uri: string): string | null {
  try {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = uri.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  } catch {
    return null;
  }
}

/**
 * Prefer embed-friendly streams (official audio / lyric videos) over
 * age-restricted official music videos that fail inside iframes.
 */
function scoreVideo(title: string, queryFallback?: string): number {
  const t = title.toLowerCase();
  let score = 0;

  // Embed-friendly formats first (rarely age-gated)
  if (t.includes("official audio")) score += 12;
  if (t.includes("lyric")) score += 10;
  if (t.includes("audio") && !t.includes("music video")) score += 6;
  if (t.includes("radio")) score += 4;

  // Music videos — often age-restricted on hip-hop / explicit tracks
  if (t.includes("official video") || t.includes("official music video")) score += 3;
  if (t.includes("music video")) score += 2;

  // Soft demotions
  if (t.includes("explicit") || t.includes("uncensored") || t.includes("no indo")) score -= 2;
  if (t.includes("live") || t.includes("performance")) score -= 1;

  // Prefer videos that actually mention the track/artist from the page
  if (queryFallback) {
    const parts = queryFallback.toLowerCase().split(/\s*-\s*|\s+/).filter((p) => p.length > 2);
    for (const part of parts.slice(0, 4)) {
      if (t.includes(part)) score += 2;
    }

    // If the page is the studio original, demote remix streams hard
    const queryIsRemix = /\bremix\b|\bmix\b|\bfeat\b|\bft\b/i.test(queryFallback);
    if (!queryIsRemix && /\bremix\b|\ba\.?\s*g\.?\s*cook\b|\baddison rae\b/i.test(t)) {
      score -= 20;
    }
  }

  return score;
}

export function YouTubePlayer({ videos = [], queryFallback }: YouTubePlayerProps) {
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const { playYoutube, activeYoutubeId } = usePlayer();

  const playableVideos = videos
    .map((v, index) => ({
      video: v,
      index,
      id: getYouTubeId(v.uri),
      score: scoreVideo(v.title, queryFallback),
    }))
    .filter((item) => item.id !== null)
    .sort((a, b) => b.score - a.score);

  const selected =
    playableVideos.find((m) => m.index === activeVideoIndex) || playableVideos[0] || null;

  if (!selected) {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
      queryFallback || ""
    )}`;

    return (
      <div className="panel p-4 flex flex-col items-center justify-center text-center min-h-[200px] border border-dg-text-muted/10">
        <div className="w-12 h-12 rounded-full bg-red-950/20 border border-red-500/20 flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-red-500">
            <path d="M11.53 1.47a.75.75 0 011.06 0l11 11a.75.75 0 01-1.06 1.06L21 12.06v9.44A1.5 1.5 0 0119.5 23h-15A1.5 1.5 0 013 21.5V12.06L1.47 13.53a.75.75 0 01-1.06-1.06l11-11z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-dg-text">Streaming Uncurated</h3>
        <p className="text-xs text-dg-text-muted mt-1 max-w-sm">
          No YouTube video coordinates are currently curated on Discogs for this release.
        </p>
        <a
          href={searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 px-4 py-1.5 rounded text-xs font-semibold text-white bg-red-600 hover:bg-red-700 hover:scale-[1.02] transition-all flex items-center gap-1.5"
        >
          Search YouTube Direct
        </a>
      </div>
    );
  }

  const { video, id } = selected;
  const isCurrentlyPlayingGlobal = activeYoutubeId === id;

  return (
    <div className="panel p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-red-500 uppercase tracking-wide flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" />
          </svg>
          Listen / Sourced Stream
        </h2>
        <span className="text-[10px] text-dg-text-muted italic">
          Source: Discogs Release Index
        </span>
      </div>

      <div className="relative w-full aspect-video rounded-md overflow-hidden bg-neutral-950 shadow-lg border border-dg-text-muted/10 group">
        <img
          src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`}
          alt={video.title}
          className="w-full h-full object-cover brightness-[0.7] group-hover:scale-105 transition-all duration-700"
        />

        <button
          onClick={() => playYoutube(id!, video.title, videos)}
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 hover:bg-black/35 transition-colors duration-300 z-10"
        >
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl border border-white/10 ${
              isCurrentlyPlayingGlobal
                ? "bg-red-600 text-white scale-105 shadow-red-500/30"
                : "bg-black/60 text-neutral-200 group-hover:scale-110 group-hover:bg-red-600 group-hover:text-white"
            }`}
          >
            {isCurrentlyPlayingGlobal ? (
              <span className="flex items-end gap-0.5 h-4 w-4">
                <span className="w-0.5 h-1.5 bg-white rounded-full animate-[soundWave_1.2s_ease-in-out_infinite_stagger]" style={{ animationDelay: "0s" }} />
                <span className="w-0.5 h-3 bg-white rounded-full animate-[soundWave_1.2s_ease-in-out_infinite_stagger]" style={{ animationDelay: "0.2s" }} />
                <span className="w-0.5 h-2 bg-white rounded-full animate-[soundWave_1.2s_ease-in-out_infinite_stagger]" style={{ animationDelay: "0.4s" }} />
              </span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 translate-x-0.5">
                <path d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" />
              </svg>
            )}
          </div>
          <span className="text-[10px] text-white/90 font-bold uppercase tracking-widest mt-3 drop-shadow bg-black/50 px-3 py-1 rounded-full border border-white/5 backdrop-blur-md">
            {isCurrentlyPlayingGlobal ? "Playing Side-Drawer" : "Dock Persistent Stream"}
          </span>
        </button>
      </div>

      <div>
        <p className="text-sm font-semibold text-dg-text line-clamp-1">{video.title}</p>
        {video.duration > 0 && (
          <p className="text-[11px] text-dg-text-muted mt-0.5">
            Duration: {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, "0")}
          </p>
        )}
        <p className="text-[10px] text-dg-text-muted mt-1">
          Preferring audio / lyric streams when possible — some music videos are age-restricted in embeds.
        </p>
      </div>

      {playableVideos.length > 1 && (
        <div className="border-t border-dg-text-muted/10 pt-3">
          <p className="text-xs text-dg-text-muted mb-2 font-medium">Alternative Streams:</p>
          <div className="max-h-[140px] overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
            {playableVideos.map((item) => {
              const isActive = activeVideoIndex === item.index;
              return (
                <button
                  key={item.index}
                  onClick={() => {
                    setActiveVideoIndex(item.index);
                    if (isCurrentlyPlayingGlobal) {
                      playYoutube(item.id!, item.video.title, videos);
                    }
                  }}
                  className={`w-full text-left p-1.5 rounded transition-all text-xs flex items-center justify-between border ${
                    isActive
                      ? "bg-red-500/10 border-red-500/30 text-red-400 font-semibold"
                      : "bg-dg-surface-elevated/20 border-transparent text-dg-text-secondary hover:bg-dg-surface-elevated/40"
                  }`}
                >
                  <span className="truncate pr-2">{item.video.title}</span>
                  {item.video.duration > 0 && (
                    <span className="shrink-0 font-mono text-[10px] text-dg-text-muted">
                      {Math.floor(item.video.duration / 60)}:{(item.video.duration % 60).toString().padStart(2, "0")}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
