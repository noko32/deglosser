export default function SongLoading() {
  return (
    <main className="mx-auto max-w-3xl lg:max-w-5xl p-4 sm:p-6 lg:p-8">
      <div className="h-4 w-24 rounded bg-dg-surface-elevated" />

      <div className="mt-6 space-y-6 animate-pulse">
        {/* Header skeleton */}
        <div className="panel p-5 flex flex-col sm:flex-row gap-6 items-start">
          <div className="w-full max-w-[280px] sm:w-[200px] aspect-square rounded-lg bg-dg-surface-elevated shrink-0" />
          <div className="min-w-0 pt-2 flex-1 space-y-3 w-full">
            <div className="h-8 w-3/4 rounded bg-dg-surface-elevated" />
            <div className="h-5 w-1/2 rounded bg-dg-surface-elevated" />
            <div className="h-4 w-1/3 rounded bg-dg-surface-elevated" />
            <div className="flex gap-3 mt-3">
              <div className="h-3 w-16 rounded bg-dg-surface-elevated" />
              <div className="h-3 w-12 rounded bg-dg-surface-elevated" />
            </div>
          </div>
        </div>

        {/* Audio features skeleton */}
        <div className="panel p-4">
          <div className="h-4 w-28 rounded bg-dg-surface-elevated mb-3" />
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-12 w-20 rounded bg-dg-surface-elevated"
              />
            ))}
          </div>
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="panel p-4">
            <div className="text-sm font-medium text-dg-accent-violet uppercase tracking-wide mb-3">
              Lyrics
            </div>
            <div className="space-y-2">
              {Array.from({ length: 8 }, (_, i) => (
                <div
                  key={i}
                  className="h-3 rounded bg-dg-surface-elevated"
                  style={{ width: `${60 + (i % 4) * 10}%` }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="panel p-4">
              <div className="text-sm font-medium text-dg-accent-violet uppercase tracking-wide mb-3">
                Credits
              </div>
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-3 rounded bg-dg-surface-elevated"
                    style={{ width: `${50 + i * 10}%` }}
                  />
                ))}
              </div>
            </div>

            <div className="panel p-4">
              <div className="text-sm font-medium text-dg-accent-violet uppercase tracking-wide mb-3">
                Samples
              </div>
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-3 rounded bg-dg-surface-elevated"
                    style={{ width: `${50 + i * 15}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
