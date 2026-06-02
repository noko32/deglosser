"use client";

import { useState, useEffect } from "react";
import { toggleFavorite, isFavorited } from "@/lib/local-storage";

interface Props {
  song: {
    mbid: string;
    title: string;
    artist: string;
    coverArtUrl: string | null;
  };
}

export function FavoriteButton({ song }: Props) {
  const [mounted, setMounted] = useState(false);
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    setIsFav(isFavorited(song.mbid));
    setMounted(true);
  }, [song.mbid]);

  function handleClick() {
    const nowFav = toggleFavorite(song);
    setIsFav(nowFav);
  }

  return (
    <button
      onClick={handleClick}
      aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
      className="transition-opacity duration-150 cursor-pointer"
      style={{ opacity: mounted ? 1 : 0 }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={isFav ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
        className={`w-6 h-6 transition-colors ${
          isFav ? "text-red-500" : "text-dg-text-muted hover:text-red-400"
        }`}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
    </button>
  );
}
