import { CoverArt } from "./CoverArt";

interface SongHeaderProps {
  title: string;
  artist: string;
  albumTitle: string | null;
  releaseDate: string | null;
  durationMs: number | null;
  coverArtUrl: string | null;
  musicalKey?: string | null;
  bpm?: number | null;
  mood?: string | null;
}

function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function SongHeader({
  title,
  artist,
  albumTitle,
  releaseDate,
  durationMs,
  coverArtUrl,
  musicalKey = null,
  bpm = null,
  mood = null,
}: SongHeaderProps) {
  return (
    <div className="panel p-5 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
      <CoverArt
        src={coverArtUrl}
        alt={`${albumTitle ?? title} cover art`}
        title={title}
        artist={artist}
        musicalKey={musicalKey}
        bpm={bpm}
        mood={mood}
      />

      <div className="min-w-0 pt-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-dg-text break-words">
          {title}
        </h1>
        <p className="mt-1 text-lg text-dg-text-secondary">{artist}</p>
        {albumTitle && (
          <p className="mt-1 text-sm text-dg-text-muted">{albumTitle}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-dg-text-muted">
          {releaseDate && <span>{releaseDate}</span>}
          {durationMs && <span>{formatDuration(durationMs)}</span>}
        </div>
      </div>
    </div>
  );
}
