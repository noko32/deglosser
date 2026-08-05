"use client";

import { usePlayer } from "@/context/PlayerContext";
import Image from "next/image";

export function FooterPlayer() {
  const { currentTrack, isPlaying, togglePlayback, volume, setVolume } = usePlayer();

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-dg-bg/85 backdrop-blur-xl border-t border-dg-text-muted/10 p-3 flex items-center justify-between shadow-[0_-8px_30px_rgb(0_0_0_/_0.3)] animate-[slideUp_0.3s_ease-out]">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}} />

      {/* Track info */}
      <div className="flex items-center gap-3 w-1/3 min-w-[150px] max-w-sm">
        <div className="relative w-10 h-10 rounded overflow-hidden border border-dg-text-muted/10 shrink-0 bg-dg-surface-elevated">
          {currentTrack.coverArtUrl ? (
            <Image
              src={currentTrack.coverArtUrl}
              alt={currentTrack.title}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-dg-accent-blue/40 to-dg-accent-violet/40" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-dg-text truncate">{currentTrack.title}</p>
          <p className="text-[10px] text-dg-text-secondary truncate">{currentTrack.artist}</p>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex flex-col items-center gap-1.5 w-1/3">
        <div className="flex items-center gap-4">
          <button
            onClick={togglePlayback}
            className="w-10 h-10 rounded-full bg-dg-text text-black hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-md"
            aria-label={isPlaying ? "Pause Preview" : "Play Preview"}
          >
            {isPlaying ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5"
              >
                <path
                  fillRule="evenodd"
                  d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5 ml-0.5"
              >
                <path
                  fillRule="evenodd"
                  d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        </div>
        
        {/* Living pulse indicator */}
        <span className="text-[9px] font-mono text-dg-accent-blue tracking-wider font-semibold animate-pulse">
          {isPlaying ? "Streaming Preview (30s)" : "Paused"}
        </span>
      </div>

      {/* Volume Bar */}
      <div className="flex items-center justify-end gap-2 w-1/3 min-w-[100px] max-w-sm">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-4 h-4 text-dg-text-muted"
        >
          <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.063.922-2.063 2.063v4.875c0 1.141.922 2.062 2.063 2.062h1.932l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06ZM17.78 9.22a.75.75 0 1 0-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 0 0 1.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 1 0 1.06-1.06L20.56 12l1.72-1.72a.75.75 0 0 0-1.06-1.06l-1.72 1.72-1.72-1.72Z" />
        </svg>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-16 sm:w-20 h-1 rounded bg-dg-surface-elevated appearance-none cursor-pointer accent-dg-accent-blue focus:outline-none"
        />
      </div>
    </div>
  );
}
