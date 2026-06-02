import { searchRecordings } from "@/lib/musicbrainz";
import Link from "next/link";
import { SearchRecorder } from "@/components/SearchRecorder";

const PER_PAGE = 20;

function formatDuration(ms: number | null): string {
  if (!ms) return "\u2014";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageStr } = await searchParams;

  if (!q) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-dg-text-muted">Enter a search query to find songs.</p>
      </main>
    );
  }

  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);
  const offset = (page - 1) * PER_PAGE;

  let results;
  try {
    results = await searchRecordings(q, PER_PAGE, offset);
  } catch {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <p className="text-red-400">
          Search failed — MusicBrainz may be rate-limiting or temporarily
          unavailable. Please wait a moment and try again.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-dg-accent-blue hover:underline"
        >
          Back to search
        </Link>
      </main>
    );
  }

  const totalPages = Math.ceil(results.count / PER_PAGE);

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold text-dg-text">
        Results for &ldquo;{q}&rdquo;
      </h1>
      <p className="mt-1 text-sm text-dg-text-muted">
        {results.count} recording{results.count !== 1 ? "s" : ""} found
        {totalPages > 1 && ` · page ${page} of ${totalPages}`}
      </p>

      <SearchRecorder query={q} />

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
                  href={`/song/${recording.id}?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(recording.title)}`}
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

      {totalPages > 1 && (
        <nav className="mt-8 flex items-center justify-between">
          {page > 1 ? (
            <Link
              href={`/search?q=${encodeURIComponent(q)}&page=${page - 1}`}
              className="text-sm text-dg-accent-blue hover:underline"
            >
              &larr; Previous
            </Link>
          ) : (
            <span />
          )}

          <span className="text-sm text-dg-text-muted">
            {page} / {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={`/search?q=${encodeURIComponent(q)}&page=${page + 1}`}
              className="text-sm text-dg-accent-blue hover:underline"
            >
              Next &rarr;
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </main>
  );
}
