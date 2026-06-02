"use client";

import { useEffect } from "react";
import { addRecentSearch } from "@/lib/local-storage";

export function SearchRecorder({ query }: { query: string }) {
  useEffect(() => {
    addRecentSearch(query);
  }, [query]);

  return null;
}
