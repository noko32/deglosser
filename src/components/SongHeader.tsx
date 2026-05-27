import Image from "next/image";
import type { SongData } from "@/lib/types";

function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function SongHeader({ song }: { song: SongData }) {
  return (
    <div className="flex gap-6 items-start">
      {song.coverArtUrl ? (
        <Image
          src={song.coverArtUrl}
          alt={`${song.albumTitle ?? song.title} cover art`}
          width={200}
          height={200}
          className="rounded-lg shrink-0 shadow-lg"
          priority
        />
      ) : (
        <div className="w-[200px] h-[200px] rounded-lg bg-dg-surface-elevated flex items-center justify-center shrink-0">
          <span className="text-4xl text-dg-text-muted">♪</span>
        </div>
      )}

      <div className="min-w-0 pt-2">
        <h1 className="text-3xl font-bold text-dg-text truncate">
          {song.title}
        </h1>
        <p className="mt-1 text-lg text-dg-text-secondary">{song.artist}</p>
        {song.albumTitle && (
          <p className="mt-1 text-sm text-dg-text-muted">{song.albumTitle}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-dg-text-muted">
          {song.releaseDate && <span>{song.releaseDate}</span>}
          {song.durationMs && <span>{formatDuration(song.durationMs)}</span>}
        </div>
      </div>
    </div>
  );
}
