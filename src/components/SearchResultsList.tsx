"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePlayer } from "@/context/PlayerContext";
import { appendFromParam } from "@/lib/contextual-back";
import type { ITunesSong } from "@/lib/itunes";

export type SearchResultSong = ITunesSong & { mbid?: string };

interface SearchResultsListProps {
  songs: SearchResultSong[];
  returnTo: string;
}

function formatDuration(ms: number | null): string {
  if (!ms) return "\u2014";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function SearchResultsList({ songs, returnTo }: SearchResultsListProps) {
  const { currentTrack, isPlaying: globalIsPlaying, playTrack, pauseTrack } = usePlayer();
  const router = useRouter();
  const [resolutionState, setResolutionState] = useState<Record<number, "loading" | "slow" | "failed">>({});
  const slowTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2800);
    setTimeout(() => setToast(null), 3400);
  };

  const handleCardClick = async (e: React.MouseEvent, song: SearchResultSong) => {
    if (song.mbid) return;

    e.preventDefault();
    const id = song.trackId;

    if (resolutionState[id] === "failed") return;
    if (resolutionState[id] === "loading") return;

    setResolutionState((s) => ({ ...s, [id]: "loading" }));

    slowTimers.current[id] = setTimeout(() => {
      setResolutionState((s) => s[id] === "loading" ? { ...s, [id]: "slow" } : s);
    }, 3000);

    try {
      const params = new URLSearchParams({
        id: String(song.trackId),
        artist: song.artistName,
        title: song.trackName,
        cover: song.artworkUrl100,
        duration: String(song.trackTimeMillis ?? ""),
        preview: song.previewUrl ?? "",
        ...(song.collectionName ? { album: song.collectionName } : {}),
        format: "json",
      });

      const res = await fetch(`/api/itunes/resolve?${params}`, {
        signal: AbortSignal.timeout(13000),
      });
      const data = await res.json();

      clearTimeout(slowTimers.current[id]);
      if (data.mbid) {
        const songUrl = new URLSearchParams({
          artist: song.artistName,
          title: song.trackName,
          cover: song.artworkUrl100,
          ...(song.collectionName ? { album: song.collectionName } : {}),
          from: returnTo,
        });
        router.push(`/song/${data.mbid}?${songUrl}`);
      } else {
        setResolutionState((s) => ({ ...s, [id]: "failed" }));
        showToast(`No data for "${song.trackName}" yet`);
      }
    } catch {
      clearTimeout(slowTimers.current[id]);
      setResolutionState((s) => ({ ...s, [id]: "failed" }));
      showToast(`No data for "${song.trackName}" yet`);
    }
  };

  const handlePlayPause = (e: React.MouseEvent, song: SearchResultSong) => {
    e.preventDefault();
    e.stopPropagation();

    const isCurrent = currentTrack?.previewUrl === song.previewUrl;

    if (isCurrent && globalIsPlaying) {
      pauseTrack();
    } else {
      playTrack({
        id: song.trackId,
        title: song.trackName,
        artist: song.artistName,
        coverArtUrl: song.artworkUrl100,
        previewUrl: song.previewUrl,
      });
    }
  };

  return (
    <>
      {/* Vanishing toast */}
      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dg-surface border border-dg-border-glass shadow-2xl backdrop-blur-sm text-sm text-dg-text transition-all duration-500 ${toastVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-dg-text-muted shrink-0">
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022ZM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
          </svg>
          <span>{toast}</span>
        </div>
      )}
      <ul className="mt-6 space-y-3">
        {songs.map((song) => {
          const isCurrent = currentTrack?.previewUrl === song.previewUrl;
          const isPlaying = isCurrent && globalIsPlaying;
          const state = resolutionState[song.trackId];
          const isFailed = state === "failed";
          const isResolving = state === "loading" || state === "slow";
          const isSlow = state === "slow";

          const encodedArtist = encodeURIComponent(song.artistName);
          const encodedTitle = encodeURIComponent(song.trackName);
          const encodedCover = encodeURIComponent(song.artworkUrl100);
          const encodedAlbum = encodeURIComponent(song.collectionName || "");

          const baseHref = song.mbid
            ? `/song/${song.mbid}?artist=${encodedArtist}&title=${encodedTitle}&cover=${encodedCover}${song.collectionName ? `&album=${encodedAlbum}` : ""
            }`
            : "#";

          const href = song.mbid ? appendFromParam(baseHref, returnTo) : "#";
          const Nav = song.mbid ? Link : "a";

          return (
            <li
              key={song.trackId}
              className={`transition-all duration-500 overflow-hidden ${isFailed ? "opacity-0 max-h-0 pointer-events-none" : "opacity-100 max-h-40"}`}
            >
              <Nav
                href={href}
                prefetch={song.mbid ? false : undefined}
                onClick={(e) => handleCardClick(e as React.MouseEvent, song)}
                className={`panel flex items-center gap-4 p-3 transition-all hover:border-dg-accent-blue/30 hover:shadow-[0_0_12px_oklch(from_var(--dg-accent-blue)_l_c_h_/_0.15)] relative ${isResolving ? "pointer-events-none" : ""}`}
                style={{ display: "flex" }}
              >
                {/* Cover Art Thumbnail & Hover Play Overlay */}
                <div className="w-12 h-12 rounded shrink-0 overflow-hidden relative group/cover">
                  <Image
                    src={song.artworkUrl100}
                    alt={song.trackName}
                    width={48}
                    height={48}
                    className="w-12 h-12 object-cover"
                  />

                  {/* Overlay Play/Pause indicator */}
                  {song.previewUrl && (
                    <button
                      onClick={(e) => handlePlayPause(e, song)}
                      className={`absolute inset-0 flex items-center justify-center bg-black/60 transition-opacity ${isPlaying ? "opacity-100" : "opacity-0 group-hover/cover:opacity-100"
                        }`}
                      aria-label={isPlaying ? "Pause Preview" : "Play Preview"}
                    >
                      {isPlaying ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-6 h-6 text-dg-accent-blue"
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
                          className="w-6 h-6 text-white"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  )}
                </div>

                {/* Title, Artist, & Album Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-dg-text">
                    {song.trackName}
                  </p>
                  <p className="truncate text-sm text-dg-text-secondary">
                    {song.artistName}
                    {song.collectionName ? ` · ${song.collectionName}` : ""}
                  </p>
                </div>

                {/* Action indicators */}
                <div className="flex items-center gap-3">
                  {/* Audio preview pulsing wave representation */}
                  {isPlaying && (
                    <div className="flex items-end gap-0.5 h-3">
                      <span className="w-0.5 bg-dg-accent-blue animate-[bounce_0.8s_infinite_100ms] h-full" style={{ animation: "bounce 0.8s infinite 100ms" }} />
                      <span className="w-0.5 bg-dg-accent-blue animate-[bounce_0.8s_infinite_300ms] h-3/4" style={{ animation: "bounce 0.8s infinite 300ms" }} />
                      <span className="w-0.5 bg-dg-accent-blue animate-[bounce_0.8s_infinite_0ms] h-1/2" style={{ animation: "bounce 0.8s infinite 0ms" }} />
                      <span className="w-0.5 bg-dg-accent-blue animate-[bounce_0.8s_infinite_200ms] h-5/6" style={{ animation: "bounce 0.8s infinite 200ms" }} />
                    </div>
                  )}

                  {/* Duration */}
                  <div className="shrink-0 text-sm font-mono text-dg-text-muted">
                    {formatDuration(song.trackTimeMillis)}
                  </div>
                </div>

                {/* Resolution loading overlay */}
                {isResolving && (
                  <div className="absolute inset-0 flex items-center justify-center bg-dg-bg/70 backdrop-blur-sm rounded-lg z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-dg-accent-blue/30 border-t-dg-accent-blue rounded-full animate-spin" />
                      <span className="text-xs text-dg-text-muted">
                        {isSlow ? "Still searching MusicBrainz…" : "Looking up…"}
                      </span>
                    </div>
                  </div>
                )}
              </Nav>
            </li>
          );
        })}
      </ul>
    </>
  );
}
