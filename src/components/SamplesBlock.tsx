import Link from "next/link";
import type { SampleRelationship } from "@/lib/types";

export function SamplesBlock({
  samples,
}: {
  samples: SampleRelationship[];
}) {
  if (samples.length === 0) return null;

  const samplesFrom = samples.filter((s) => s.direction === "samples");
  const sampledBy = samples.filter((s) => s.direction === "sampled_by");

  return (
    <div className="panel p-4">
      <h2 className="text-sm font-medium text-dg-accent-violet uppercase tracking-wide mb-3">
        Samples
      </h2>

      {samplesFrom.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-medium text-dg-text-muted uppercase tracking-wide mb-2">
            Samples from
          </h3>
          <ul className="space-y-1.5">
            {samplesFrom.map((s) => (
              <li key={s.mbid}>
                <Link
                  href={`/song/${s.mbid}`}
                  className="text-sm text-dg-accent-blue hover:underline"
                >
                  {s.title}
                </Link>
                <span className="text-sm text-dg-text-muted">
                  {" "}
                  by {s.artist}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sampledBy.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-dg-text-muted uppercase tracking-wide mb-2">
            Sampled by
          </h3>
          <ul className="space-y-1.5">
            {sampledBy.map((s) => (
              <li key={s.mbid}>
                <Link
                  href={`/song/${s.mbid}`}
                  className="text-sm text-dg-accent-blue hover:underline"
                >
                  {s.title}
                </Link>
                <span className="text-sm text-dg-text-muted">
                  {" "}
                  by {s.artist}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
