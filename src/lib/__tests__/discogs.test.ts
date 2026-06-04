import { describe, it, expect } from "vitest";
import {
  matchesPhysicalFormat,
  normalizeTitle,
  findTrackInTracklist,
  mapCredits,
} from "@/lib/discogs";
import type { DiscogsTrack, DiscogsExtraArtist } from "@/lib/discogs";

describe("matchesPhysicalFormat", () => {
  it("matches Vinyl", () => {
    expect(matchesPhysicalFormat(["Vinyl", "LP", "Album"])).toBe(true);
  });

  it("matches CD (case-insensitive)", () => {
    expect(matchesPhysicalFormat(["CD", "Album"])).toBe(true);
  });

  it("rejects digital-only formats", () => {
    expect(matchesPhysicalFormat(["File", "MP3", "Album"])).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(matchesPhysicalFormat(undefined)).toBe(false);
  });
});

describe("normalizeTitle", () => {
  it("lowercases and strips non-alphanumeric", () => {
    expect(normalizeTitle("HUMBLE.")).toBe("humble");
  });

  it("handles spaces and punctuation", () => {
    expect(normalizeTitle("DNA.")).toBe("dna");
  });
});

describe("findTrackInTracklist", () => {
  const tracklist: DiscogsTrack[] = [
    { position: "1", title: "BLOOD." },
    { position: "2", title: "DNA." },
    { position: "3", title: "YAH." },
    { position: "7", title: "HUMBLE." },
  ];

  it("finds exact title match", () => {
    expect(findTrackInTracklist(tracklist, "HUMBLE.")?.position).toBe("7");
  });

  it("finds partial match (query is substring of track)", () => {
    expect(findTrackInTracklist(tracklist, "HUMBLE")?.position).toBe("7");
  });

  it("returns null when no match", () => {
    expect(findTrackInTracklist(tracklist, "Nonexistent")).toBeNull();
  });
});

describe("mapCredits", () => {
  it("maps extraartists to DiscogsCredit format", () => {
    const artists: DiscogsExtraArtist[] = [
      { name: "Mike WiLL Made-It", role: "Producer" },
    ];
    expect(mapCredits(artists)).toEqual([
      { name: "Mike WiLL Made-It", role: "Producer" },
    ]);
  });

  it("uses anv (artist name variation) when present", () => {
    const artists: DiscogsExtraArtist[] = [
      { name: "Michael Williams II", role: "Producer", anv: "Mike WiLL" },
    ];
    const credits = mapCredits(artists);
    expect(credits[0].name).toBe("Mike WiLL");
    expect(credits[0].anv).toBe("Mike WiLL");
  });
});
