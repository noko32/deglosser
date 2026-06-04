"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavBar() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <nav className="glass-nav sticky top-0 z-50 flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 w-full">
      <Link
        href="/"
        className="shrink-0 text-lg font-bold tracking-tight text-dg-text"
      >
        Melomano
      </Link>

      {!isHome && (
        <form action="/search" className="flex-1 max-w-md">
          <div className="relative">
            <input
              type="text"
              name="q"
              placeholder="Search songs..."
              required
              className="w-full rounded-lg border border-dg-border bg-dg-surface pl-3 pr-9 py-1.5 text-sm text-dg-text placeholder-dg-text-muted focus:border-dg-accent-blue focus:outline-none focus:ring-2 focus:ring-dg-accent-blue/25"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-dg-text-muted hover:text-dg-accent-blue transition-colors"
              aria-label="Search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </form>
      )}

      <Link
        href="/favorites"
        className="shrink-0 ml-auto text-dg-text-muted hover:text-dg-accent-blue transition-colors"
        aria-label="Favorites"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
        </svg>
      </Link>
    </nav>
  );
}
