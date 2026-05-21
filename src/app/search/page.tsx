import { searchRecordings } from "@/lib/musicbrainz";
import Link from "next/link";

function formatDuration(ms: number | null): string {
  if (!ms) return "\u2014";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  if (!q) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-dg-text-muted">Enter a search query to find songs.</p>
      </main>
    );
  }

  const results = await searchRecordings(q, 20);

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold text-dg-text">
        Results for &ldquo;{q}&rdquo;
      </h1>
      <p className="mt-1 text-sm text-dg-text-muted">
        {results.count} recording{results.count !== 1 ? "s" : ""} found
      </p>

      {results.recordings.length === 0 ? (
        <p className="mt-8 text-dg-text-muted">No results found.</p>
      ) : (
        <ul className="mt-6 divide-y divide-dg-border">
          {results.recordings.map((recording) => {
            const artist =
              recording.artistCredit.map((ac) => ac.name).join(", ") ||
              "Unknown Artist";
            const album =
              recording.releases.find(
                (r) => r.releaseGroup.primaryType === "Album"
              ) || recording.releases[0];

            return (
              <li key={recording.id}>
                <Link
                  href={`/song/${recording.id}`}
                  className="block rounded-lg py-4 px-3 -mx-3 transition-colors hover:bg-dg-surface"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-dg-text">
                        {recording.title}
                      </p>
                      <p className="truncate text-sm text-dg-text-secondary">
                        {artist}
                        {album ? ` \u00b7 ${album.title}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-sm font-mono text-dg-text-muted">
                      {formatDuration(recording.length)}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
