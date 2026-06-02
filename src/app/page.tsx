import Link from "next/link";
import { RecentSearches } from "@/components/RecentSearches";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-dg-text">
          Melomano
        </h1>
        <p className="mt-3 text-lg text-dg-text-secondary">
          Search any song. Get lyrics, BPM, key, credits, and more.
        </p>
      </div>

      <form action="/search" className="w-full max-w-md">
        <div className="flex gap-2">
          <input
            type="text"
            name="q"
            placeholder="Song name or 'song by artist'..."
            required
            className="flex-1 rounded-lg border border-dg-border bg-dg-surface px-4 py-3 text-dg-text placeholder-dg-text-muted focus:border-dg-accent-blue focus:outline-none focus:ring-2 focus:ring-dg-accent-blue/25"
          />
          <button
            type="submit"
            className="btn-primary rounded-lg px-6 py-3 font-medium text-white"
          >
            Search
          </button>
        </div>
      </form>

      <RecentSearches />

      <Link
        href="/favorites"
        className="text-sm text-dg-text-muted hover:text-dg-accent-blue transition-colors"
      >
        View favorites
      </Link>
    </main>
  );
}
