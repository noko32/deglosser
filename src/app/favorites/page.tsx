import type { Metadata } from "next";
import Link from "next/link";
import { FavoritesList } from "./FavoritesList";

export const metadata: Metadata = {
  title: "Favorites — Melomano",
  description: "Your saved songs on Melomano.",
};

export default function FavoritesPage() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link href="/" className="text-sm text-dg-accent-blue hover:underline">
        &larr; Back to search
      </Link>
      <h1 className="mt-6 text-2xl font-bold text-dg-text">Favorites</h1>
      <FavoritesList />
    </main>
  );
}
