"use client";

import { useRef } from "react";
import Image from "next/image";
import { usePlayer } from "@/context/PlayerContext";

interface InlinePlayerHeaderProps {
  onToggle: () => void;
  isExpanded: boolean;
}

export function InlinePlayerHeader({ onToggle, isExpanded }: InlinePlayerHeaderProps) {
  const { activeSongTitle, activeSongArtist, activeSongCoverArtUrl, isPlaying, togglePlayback, currentTrack } = usePlayer();
  const pointerStartY = useRef(0);
  const pointerStartTime = useRef(0);

  const title = activeSongTitle || "No song selected";
  const artist = activeSongArtist || "—";

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStartY.current = e.clientY;
    pointerStartTime.current = Date.now();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const elapsed = Date.now() - pointerStartTime.current;
    const deltaY = e.clientY - pointerStartY.current;

    if (elapsed < 250 && Math.abs(deltaY) < 10) {
      onToggle();
      return;
    }

    // Swipe gesture
    if (Math.abs(deltaY) > 20) {
      if (deltaY < 0 && !isExpanded) onToggle();
      if (deltaY > 0 && isExpanded) onToggle();
    }
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    togglePlayback();
  };

  return (
    <div
      className="inline-player-header flex-shrink-0 px-4 py-3 flex flex-col gap-2 cursor-pointer select-none rounded-t-2xl bg-dg-bg/98 border-b border-dg-border-glass lg:hidden"
      style={{ touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      {/* Main row: song info + play + chevron */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 max-w-[55%]">
          <div className="w-9 h-9 rounded bg-dg-surface-elevated border border-dg-border-glass shrink-0 overflow-hidden relative">
            {activeSongCoverArtUrl && (
              <Image src={activeSongCoverArtUrl} alt="" fill className="object-cover" unoptimized />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-dg-text truncate">{title}</h4>
            <p className="text-[10px] text-dg-text-muted truncate">{artist}</p>
          </div>
        </div>

        {currentTrack && (
          <button
            onClick={handlePlayClick}
            className="w-9 h-9 rounded-full bg-dg-text text-dg-bg flex items-center justify-center shrink-0"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 ml-0.5">
                <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        )}

        <div
          className={`w-6 h-6 flex items-center justify-center text-dg-text-muted transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <polyline points="6,9 12,15 18,9" />
          </svg>
        </div>
      </div>

      {/* Mini progress bar */}
      <div className="h-[3px] bg-dg-surface-elevated rounded-full overflow-hidden">
        <div className="h-full bg-dg-accent-violet rounded-full w-[35%]" />
      </div>
    </div>
  );
}
