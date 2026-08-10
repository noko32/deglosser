"use client";

import { useRouter } from "next/navigation";
import {
  decideContextualBack,
  INTERNAL_NAV_KEY,
} from "@/lib/contextual-back";

export function ContextualBack({
  from,
  className = "text-sm text-dg-accent-blue hover:underline",
}: {
  from?: string | null;
  className?: string;
}) {
  const router = useRouter();

  function onClick() {
    let internalNav = false;
    try {
      internalNav = sessionStorage.getItem(INTERNAL_NAV_KEY) === "1";
    } catch {
      /* sessionStorage unavailable */
    }

    const action = decideContextualBack({
      from,
      referrer: document.referrer,
      origin: window.location.origin,
      internalNav,
      historyLength: window.history.length,
    });

    if (action.kind === "history-back") {
      router.back();
    } else {
      router.push(action.href);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      aria-label="Go back"
    >
      &larr; Back
    </button>
  );
}
