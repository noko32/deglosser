"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavBar() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <nav className="glass-nav sticky top-0 z-50 flex items-center justify-between gap-4 px-6 py-3">
      <Link
        href="/"
        className="shrink-0 text-lg font-bold tracking-tight text-dg-text"
      >
        Melomano
      </Link>

      {!isHome && (
        <form action="/search" className="flex-1 max-w-md">
          <input
            type="text"
            name="q"
            placeholder="Search songs..."
            required
            className="w-full rounded-lg border border-dg-border bg-dg-surface px-3 py-1.5 text-sm text-dg-text placeholder-dg-text-muted focus:border-dg-accent-blue focus:outline-none focus:ring-2 focus:ring-dg-accent-blue/25"
          />
        </form>
      )}

      <Link
        href="/favorites"
        className="shrink-0 text-dg-text-muted hover:text-dg-accent-blue transition-colors"
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
