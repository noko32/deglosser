import type { AudioFeaturesResult } from "@/lib/types";

function Badge({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="panel px-3 py-2 text-center min-w-[60px] sm:min-w-[80px]">
      <p className="text-xs text-dg-text-muted uppercase tracking-wide">
        {label}
      </p>
      <p className="text-lg font-semibold text-dg-text mt-0.5">{value}</p>
      {subtitle && (
        <p className="text-[10px] text-dg-text-muted mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}

function BarBadge({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const pct = Math.round(value * 100);
  return (
    <div className="panel px-3 py-2 min-w-[70px] sm:min-w-[100px]">
      <p className="text-xs text-dg-text-muted uppercase tracking-wide">
        {label}
      </p>
      <div className="mt-1.5 h-1.5 rounded-full bg-dg-surface-elevated overflow-hidden">
        <div
          className="h-full rounded-full bg-dg-accent-blue"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-dg-text-muted mt-1 text-right">{pct}%</p>
    </div>
  );
}

export function AudioFeatures({
  features,
}: {
  features: AudioFeaturesResult | null;
}) {
  if (!features) return null;

  const hasSomething =
    features.bpm != null ||
    features.key != null ||
    features.energy != null;

  if (!hasSomething) return null;

  return (
    <div className="panel p-4">
      <h2 className="text-sm font-medium text-dg-accent-violet uppercase tracking-wide mb-3">
        Audio Features
      </h2>

      <div className="flex flex-wrap gap-2">
        {features.bpm != null && (
          <Badge
            label="BPM"
            value={Math.round(features.bpm).toString()}
            subtitle={
              features.bpmAlt
                ? `alt: ${Math.round(features.bpmAlt)}`
                : undefined
            }
          />
        )}

        {features.key && (
          <Badge
            label="Key"
            value={features.key}
            subtitle={features.camelot ?? undefined}
          />
        )}

        {features.mood && (
          <Badge label="Mood" value={features.mood} />
        )}

        {features.genre && (
          <Badge label="Genre" value={features.genre} />
        )}

        {features.energy != null && (
          <BarBadge label="Energy" value={features.energy} />
        )}

        {features.danceability != null && (
          <BarBadge label="Danceability" value={features.danceability} />
        )}

        {features.valence != null && (
          <BarBadge label="Valence" value={features.valence} />
        )}
      </div>

      <p className="text-[10px] text-dg-text-muted mt-3 italic">
        Audio features are estimated via algorithmic analysis
      </p>
    </div>
  );
}
