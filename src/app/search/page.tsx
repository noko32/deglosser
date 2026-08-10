import { searchITunesSongs } from "@/lib/itunes";
import { batchGetItunesMappings } from "@/lib/cache";
import Link from "next/link";
import { SearchRecorder } from "@/components/SearchRecorder";
import { SearchResultsList } from "@/components/SearchResultsList";

const PER_PAGE = 20;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageStr } = await searchParams;

  if (!q) {
    return (
      <main className="flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-8">
        <p className="text-dg-text-muted">Enter a search query to find songs.</p>
      </main>
    );
  }

  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);
  const offset = (page - 1) * PER_PAGE;

  let allSongs = [];
  try {
    allSongs = await searchITunesSongs(q, 100);
  } catch {
    return (
      <main className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
        <p className="text-red-400">
          Search failed — iTunes Search may be temporarily unavailable.
          Please wait a moment and try again.
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

  const paginatedSongs = allSongs.slice(offset, offset + PER_PAGE);
  const cachedMappings = await batchGetItunesMappings(
    paginatedSongs.map((s) => String(s.trackId))
  );
  const songs = paginatedSongs.map((song) => ({
    ...song,
    mbid: cachedMappings.get(String(song.trackId))?.mbid,
  }));

  const totalCount = allSongs.length;
  const totalPages = Math.ceil(totalCount / PER_PAGE);

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-dg-text">
        Results for &ldquo;{q}&rdquo;
      </h1>
      <p className="mt-1 text-sm text-dg-text-muted">
        {totalCount} song{totalCount !== 1 ? "s" : ""} found
        {totalPages > 1 && ` · page ${page} of ${totalPages}`}
      </p>

      <SearchRecorder query={q} />

      {allSongs.length === 0 ? (
        <p className="mt-8 text-dg-text-muted">No results found.</p>
      ) : (
        <SearchResultsList
          songs={songs}
          returnTo={`/search?q=${encodeURIComponent(q)}&page=${page}`}
        />
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
            Page {page} of {totalPages}
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
