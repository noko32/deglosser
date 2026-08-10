"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { INTERNAL_NAV_KEY } from "@/lib/contextual-back";

export function InternalNavMarker() {
  const pathname = usePathname();
  const prev = useRef<string | null>(null);

  useEffect(() => {
    if (prev.current !== null && prev.current !== pathname) {
      try {
        sessionStorage.setItem(INTERNAL_NAV_KEY, "1");
      } catch {
        /* sessionStorage unavailable */
      }
    }
    prev.current = pathname;
  }, [pathname]);

  return null;
}
