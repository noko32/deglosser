"use client";

import Image from "next/image";
import Link from "next/link";
import { usePlayer } from "@/context/PlayerContext";
import type { ITunesSong } from "@/lib/itunes";

export type SearchResultSong = ITunesSong & { mbid?: string };

interface SearchResultsListProps {
  songs: SearchResultSong[];
  query: string;
}

function formatDuration(ms: number | null): string {
  if (!ms) return "\u2014";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function SearchResultsList({ songs, query }: SearchResultsListProps) {
  const { currentTrack, isPlaying: globalIsPlaying, playTrack, pauseTrack } = usePlayer();

  const handlePlayPause = (e: React.MouseEvent, song: SearchResultSong) => {
    e.preventDefault();
    e.stopPropagation(); // Avoid triggering the card's navigation link!

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
    <ul className="mt-6 space-y-3">
      {songs.map((song) => {
        const isCurrent = currentTrack?.previewUrl === song.previewUrl;
        const isPlaying = isCurrent && globalIsPlaying;
        const encodedArtist = encodeURIComponent(song.artistName);
        const encodedTitle = encodeURIComponent(song.trackName);
        const encodedCover = encodeURIComponent(song.artworkUrl100);
        const encodedPreview = encodeURIComponent(song.previewUrl || "");
        const encodedAlbum = encodeURIComponent(song.collectionName || "");

        const href = song.mbid
          ? `/song/${song.mbid}?artist=${encodedArtist}&title=${encodedTitle}&cover=${encodedCover}${
              song.collectionName ? `&album=${encodedAlbum}` : ""
            }`
          : `/api/itunes/resolve?id=${song.trackId}&artist=${encodedArtist}&title=${encodedTitle}&cover=${encodedCover}&duration=${song.trackTimeMillis}&preview=${encodedPreview}${
              song.collectionName ? `&album=${encodedAlbum}` : ""
            }`;

        return (
          <li key={song.trackId}>
            <Link
              href={href}
              className="panel flex items-center gap-4 p-3 transition-all hover:border-dg-accent-blue/30 hover:shadow-[0_0_12px_oklch(from_var(--dg-accent-blue)_l_c_h_/_0.15)] relative"
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
                    className={`absolute inset-0 flex items-center justify-center bg-black/60 transition-opacity ${
                      isPlaying ? "opacity-100" : "opacity-0 group-hover/cover:opacity-100"
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
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
