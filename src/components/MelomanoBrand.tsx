import type { MelomanoBrandSize } from "@/lib/presence";
import { MelomanoMark } from "@/components/MelomanoMark";

type MelomanoBrandProps = {
  size: MelomanoBrandSize;
  /** Unique gradient id prefix for this instance. */
  gradientId: string;
  className?: string;
};

export function MelomanoBrand({
  size,
  gradientId,
  className = "",
}: MelomanoBrandProps) {
  if (size === "hero") {
    return (
      <h1
        className={`inline-flex items-center justify-center gap-3 sm:gap-3.5 ${className}`.trim()}
      >
        <MelomanoMark
          className="h-9 w-9 sm:h-10 sm:w-10 shrink-0"
          gradientId={gradientId}
        />
        <span className="hero-caps text-4xl sm:text-5xl lg:text-6xl">
          MELOMANO
        </span>
      </h1>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`.trim()}>
      <MelomanoMark className="h-5 w-5 shrink-0" gradientId={gradientId} />
      <span className="hero-caps text-base sm:text-lg">MELOMANO</span>
    </span>
  );
}
