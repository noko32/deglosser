"use client";

import { useReducer, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  getRecentSearches,
  clearRecentSearches,
  type RecentSearch,
} from "@/lib/local-storage";

const emptySubscribe = () => () => {};

export function RecentSearches() {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [, rerender] = useReducer((x: number) => x + 1, 0);

  const searches: RecentSearch[] = mounted ? getRecentSearches() : [];

  function handleClear() {
    clearRecentSearches();
    rerender();
  }

  if (!mounted || searches.length === 0) return null;

  return (
    <div className="w-full max-w-md animate-in fade-in duration-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-dg-text-muted uppercase tracking-wide">
          Recent searches
        </span>
        <button
          onClick={handleClear}
          className="text-xs text-dg-text-muted hover:text-dg-text transition-colors cursor-pointer"
        >
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {searches.map((s) => (
          <Link
            key={s.query}
            href={`/search?q=${encodeURIComponent(s.query)}`}
            className="rounded-full border border-dg-border bg-dg-surface px-3 py-1 text-sm text-dg-text-secondary hover:text-dg-text hover:border-dg-accent-blue/50 transition-colors"
          >
            {s.query}
          </Link>
        ))}
      </div>
    </div>
  );
}
