export type BackAction =
  | { kind: "history-back" }
  | { kind: "push"; href: string };

export const CONTEXTUAL_BACK_HOME = "/";
export const INTERNAL_NAV_KEY = "melomano:internalNav";

export function decideHistoryBack(input: {
  referrer: string;
  origin: string;
  internalNav: boolean;
  historyLength: number;
}): BackAction {
  const { referrer, origin, internalNav, historyLength } = input;

  if (referrer) {
    try {
      if (new URL(referrer).origin !== origin) {
        return { kind: "push", href: CONTEXTUAL_BACK_HOME };
      }
      return { kind: "history-back" };
    } catch {
      return { kind: "push", href: CONTEXTUAL_BACK_HOME };
    }
  }

  if (internalNav && historyLength > 1) {
    return { kind: "history-back" };
  }

  return { kind: "push", href: CONTEXTUAL_BACK_HOME };
}

/** Same-origin path+query only; rejects open redirects. */
export function sanitizeReturnTo(
  from: string | null | undefined,
  origin: string
): string {
  if (!from) return CONTEXTUAL_BACK_HOME;

  const trimmed = from.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return CONTEXTUAL_BACK_HOME;
  }

  if (/^[a-zA-Z][a-zA-Z+\-.]*:/.test(trimmed)) {
    return CONTEXTUAL_BACK_HOME;
  }

  try {
    const resolved = new URL(trimmed, origin);
    if (resolved.origin !== origin) return CONTEXTUAL_BACK_HOME;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return CONTEXTUAL_BACK_HOME;
  }
}

/** Returns a push target, or null to use history back. */
export function resolveFromParam(
  from: string | null | undefined,
  origin: string
): string | null {
  if (from == null || from.trim() === "") return null;
  const trimmed = from.trim();
  const safe = sanitizeReturnTo(trimmed, origin);
  if (safe === CONTEXTUAL_BACK_HOME && trimmed !== "/") {
    return null;
  }
  return safe;
}

export function decideContextualBack(
  input: {
    from?: string | null;
  } & Parameters<typeof decideHistoryBack>[0]
): BackAction {
  const resolved = resolveFromParam(input.from, input.origin);
  if (resolved !== null) {
    return { kind: "push", href: resolved };
  }
  return decideHistoryBack(input);
}

export function appendFromParam(
  href: string,
  returnToPathAndQuery: string
): string {
  const url = new URL(href, "https://melomano.local");
  const safe = sanitizeReturnTo(returnToPathAndQuery, "https://melomano.local");
  url.searchParams.set("from", safe);
  return `${url.pathname}${url.search}`;
}
