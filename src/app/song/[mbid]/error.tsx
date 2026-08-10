"use client";

import { ContextualBack } from "@/components/ContextualBack";

export default function SongError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <p className="text-red-400">Something went wrong loading this song.</p>
      <div className="mt-4 flex gap-4">
        <button
          onClick={reset}
          className="text-sm text-dg-accent-blue hover:underline"
        >
          Try again
        </button>
        <ContextualBack />
      </div>
    </main>
  );
}
