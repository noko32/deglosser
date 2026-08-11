type MelomanoMarkProps = {
  className?: string;
  /** Unique per instance so multiple marks on one page don’t clash. */
  gradientId: string;
};

/** V3 vinyl · Melomano multi-hue rim (pd_melomano_visual_presence E2l). */
export function MelomanoMark({ className, gradientId }: MelomanoMarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(72% 0.12 260)" />
          <stop offset="50%" stopColor="oklch(75% 0.14 300)" />
          <stop offset="100%" stopColor="oklch(78% 0.13 85)" />
        </linearGradient>
      </defs>
      <circle
        cx="32"
        cy="32"
        r="28"
        fill="#07070a"
        stroke={`url(#${gradientId})`}
        strokeWidth="2.25"
      />
      <circle
        cx="32"
        cy="32"
        r="23"
        fill="none"
        stroke="oklch(80% 0.03 260 / 0.5)"
        strokeWidth="1"
      />
      <circle
        cx="32"
        cy="32"
        r="18"
        fill="none"
        stroke="oklch(80% 0.03 260 / 0.35)"
        strokeWidth="1"
      />
      <circle
        cx="32"
        cy="32"
        r="13"
        fill="none"
        stroke="oklch(80% 0.03 260 / 0.25)"
        strokeWidth="1"
      />
      <circle
        cx="32"
        cy="32"
        r="9.5"
        fill="oklch(70% 0.14 280)"
        stroke="oklch(95% 0.05 85 / 0.7)"
        strokeWidth="1.2"
      />
      <circle cx="32" cy="32" r="2.3" fill="#07070a" />
    </svg>
  );
}
