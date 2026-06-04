"use client";

import { useReducer, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  getFavorites,
  toggleFavorite,
  type FavoriteSong,
} from "@/lib/local-storage";

const emptySubscribe = () => () => {};

export function FavoritesList() {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [, rerender] = useReducer((x: number) => x + 1, 0);

  const favorites: FavoriteSong[] = mounted ? getFavorites() : [];

  function handleRemove(song: FavoriteSong) {
    toggleFavorite(song);
    rerender();
  }

  if (!mounted) {
    return (
      <div className="mt-6 space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 rounded-lg bg-dg-surface-elevated"
          />
        ))}
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="mt-12 text-center">
        <p className="text-dg-text-muted">
          No favorites yet. Search for songs and tap the heart to save them
          here.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-dg-accent-blue hover:underline"
        >
          Search for songs
        </Link>
      </div>
    );
  }

  return (
    <ul className="mt-6 divide-y divide-dg-border">
      {favorites.map((song) => (
        <li key={song.mbid} className="flex items-center gap-4 py-4">
          <Link
            href={`/song/${song.mbid}`}
            className="flex items-center gap-4 flex-1 min-w-0 rounded-lg transition-colors hover:bg-dg-surface -m-2 p-2"
          >
            {song.coverArtUrl ? (
              <img
                src={song.coverArtUrl}
                alt=""
                width={56}
                height={56}
                className="w-14 h-14 rounded-md shrink-0 object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-md bg-dg-surface-elevated shrink-0 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5 text-dg-text-muted"
                >
                  <path d="M18 3a1 1 0 0 0-1.196-.98l-10 2A1 1 0 0 0 6 5v9.114A4.369 4.369 0 0 0 5 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0 0 15 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3Z" />
                </svg>
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-medium text-dg-text">{song.title}</p>
              <p className="truncate text-sm text-dg-text-secondary">
                {song.artist}
              </p>
            </div>
          </Link>
          <button
            onClick={() => handleRemove(song)}
            aria-label={`Remove ${song.title} from favorites`}
            className="shrink-0 p-2 text-dg-text-muted hover:text-red-400 transition-colors cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path
                fillRule="evenodd"
                d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.519.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  );
}
