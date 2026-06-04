import type { Credit, DiscogsEnrichment } from "@/lib/types";

function groupByRole(credits: { name: string; role: string }[]) {
  const groups = new Map<string, string[]>();
  for (const c of credits) {
    const existing = groups.get(c.role) ?? [];
    existing.push(c.name);
    groups.set(c.role, existing);
  }
  return groups;
}

function CreditGroup({
  title,
  credits,
}: {
  title: string;
  credits: { name: string; role: string }[];
}) {
  if (credits.length === 0) return null;
  const grouped = groupByRole(credits);

  return (
    <div>
      <h3 className="text-xs font-medium text-dg-text-muted uppercase tracking-wide mb-2">
        {title}
      </h3>
      <dl className="space-y-2">
        {Array.from(grouped.entries()).map(([role, names]) => (
          <div key={role} className="text-sm">
            <dt className="text-dg-text-muted text-xs">{role}</dt>
            <dd className="text-dg-text-secondary">{names.join(", ")}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function CreditsBlock({
  credits,
  discogs,
}: {
  credits: Credit[];
  discogs: DiscogsEnrichment | null;
}) {
  const mbCredits = credits.filter((c) => c.source === "musicbrainz");
  const discogsTrack = discogs?.trackCredits ?? [];
  const discogsRelease = discogs?.releaseCredits ?? [];

  const hasAnything =
    mbCredits.length > 0 ||
    discogsTrack.length > 0 ||
    discogsRelease.length > 0;

  if (!hasAnything) {
    return (
      <div className="panel p-4">
        <h2 className="text-sm font-medium text-dg-accent-violet uppercase tracking-wide mb-3">
          Credits
        </h2>
        <p className="text-sm text-dg-text-muted italic">
          No credits available for this track.
        </p>
      </div>
    );
  }

  return (
    <div className="panel p-4">
      <h2 className="text-sm font-medium text-dg-accent-violet uppercase tracking-wide mb-4">
        Credits
      </h2>

      <div className="space-y-5">
        <CreditGroup title="Song Credits" credits={mbCredits} />

        {discogsTrack.length > 0 && (
          <CreditGroup title="Track Credits" credits={discogsTrack} />
        )}

        {discogsRelease.length > 0 && (
          <CreditGroup title="Album Credits" credits={discogsRelease} />
        )}
      </div>

      {(discogs?.genres?.length ?? 0) > 0 && (
        <div className="mt-4 pt-3 border-t border-dg-border-glass">
          <div className="flex flex-wrap gap-1.5">
            {discogs!.genres.map((g) => (
              <span
                key={g}
                className="text-xs px-2 py-0.5 rounded-full bg-dg-surface-elevated text-dg-text-secondary"
              >
                {g}
              </span>
            ))}
            {discogs!.styles.map((s) => (
              <span
                key={s}
                className="text-xs px-2 py-0.5 rounded-full bg-dg-surface-elevated text-dg-text-muted"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
