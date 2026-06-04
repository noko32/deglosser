import { describe, it, expect } from "vitest";
import { selectBestRelease } from "@/lib/musicbrainz";
import type { MBRelease } from "@/lib/types";

describe("selectBestRelease", () => {
  it("returns null for empty array", () => {
    expect(selectBestRelease([])).toBeNull();
  });

  it("prefers Album over Single", () => {
    const releases: MBRelease[] = [
      {
        id: "single-1",
        title: "HUMBLE.",
        date: "2017-03-30",
        "release-group": { "primary-type": "Single" },
      },
      {
        id: "album-1",
        title: "DAMN.",
        date: "2017-04-14",
        "release-group": { "primary-type": "Album" },
      },
    ];
    expect(selectBestRelease(releases)?.id).toBe("album-1");
  });

  it("picks earliest album when multiple exist", () => {
    const releases: MBRelease[] = [
      {
        id: "late",
        title: "DAMN. Deluxe",
        date: "2018-01-01",
        "release-group": { "primary-type": "Album" },
      },
      {
        id: "early",
        title: "DAMN.",
        date: "2017-04-14",
        "release-group": { "primary-type": "Album" },
      },
    ];
    expect(selectBestRelease(releases)?.id).toBe("early");
  });
});
