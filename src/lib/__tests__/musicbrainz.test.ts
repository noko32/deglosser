import { describe, it, expect } from "vitest";
import {
  buildSearchQuery,
  selectBestRelease,
  extractCredits,
  extractSamples,
} from "@/lib/musicbrainz";
import type { MBRelease, MBRelation } from "@/lib/types";

describe("buildSearchQuery", () => {
  it("parses 'X by Y' pattern", () => {
    expect(buildSearchQuery("HUMBLE by Kendrick Lamar")).toBe(
      "recording:HUMBLE AND artist:Kendrick Lamar"
    );
  });

  it("parses 'Artist - Title' with hyphen", () => {
    expect(buildSearchQuery("Kendrick Lamar - HUMBLE")).toBe(
      "recording:HUMBLE AND artist:Kendrick Lamar"
    );
  });

  it("parses em-dash separator", () => {
    expect(buildSearchQuery("Daft Punk — Get Lucky")).toBe(
      "recording:Get Lucky AND artist:Daft Punk"
    );
  });

  it("falls back to last-word-as-artist for multi-word input", () => {
    expect(buildSearchQuery("Bohemian Rhapsody Queen")).toBe(
      "recording:Bohemian Rhapsody AND artist:Queen"
    );
  });

  it("returns raw string for single word", () => {
    expect(buildSearchQuery("HUMBLE")).toBe("HUMBLE");
  });
});

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

  it("excludes compilations", () => {
    const releases: MBRelease[] = [
      {
        id: "comp",
        title: "Greatest Hits",
        date: "2015-01-01",
        "release-group": {
          "primary-type": "Album",
          "secondary-types": ["Compilation"],
        },
      },
      {
        id: "album",
        title: "DAMN.",
        date: "2017-04-14",
        "release-group": { "primary-type": "Album" },
      },
    ];
    expect(selectBestRelease(releases)?.id).toBe("album");
  });

  it("falls back to earliest non-album if no albums exist", () => {
    const releases: MBRelease[] = [
      { id: "single-late", title: "B", date: "2020-01-01" },
      { id: "single-early", title: "A", date: "2019-01-01" },
    ];
    expect(selectBestRelease(releases)?.id).toBe("single-early");
  });
});

describe("extractCredits", () => {
  it("extracts recording-level artist credits", () => {
    const relations: MBRelation[] = [
      {
        type: "producer",
        "type-id": "xxx",
        target: "some-target",
        direction: "backward",
        artist: { id: "a1", name: "Mike WiLL Made-It", "sort-name": "Mike" },
      },
    ];
    const credits = extractCredits(relations);
    expect(credits).toEqual([
      { name: "Mike WiLL Made-It", role: "producer", source: "musicbrainz" },
    ]);
  });

  it("extracts work-level nested credits", () => {
    const relations: MBRelation[] = [
      {
        type: "performance",
        "type-id": "xxx",
        target: "some-target",
        direction: "forward",
        work: {
          id: "w1",
          title: "HUMBLE.",
          relations: [
            {
              type: "writer",
              "type-id": "yyy",
              target: "some-target",
              direction: "backward",
              artist: {
                id: "a2",
                name: "Kendrick Duckworth",
                "sort-name": "Duckworth",
              },
            },
          ],
        },
      },
    ];
    const credits = extractCredits(relations);
    expect(credits).toContainEqual({
      name: "Kendrick Duckworth",
      role: "writer",
      source: "musicbrainz",
    });
  });

  it("deduplicates by name+role", () => {
    const relations: MBRelation[] = [
      {
        type: "producer",
        "type-id": "xxx",
        target: "t1",
        direction: "backward",
        artist: { id: "a1", name: "DJ Premier", "sort-name": "Premier" },
      },
      {
        type: "producer",
        "type-id": "xxx",
        target: "t2",
        direction: "backward",
        artist: { id: "a1", name: "DJ Premier", "sort-name": "Premier" },
      },
    ];
    const credits = extractCredits(relations);
    expect(credits).toHaveLength(1);
  });
});

describe("extractSamples", () => {
  it("extracts forward sample relationships", () => {
    const relations: MBRelation[] = [
      {
        type: "samples material",
        "type-id": "xxx",
        target: "t1",
        direction: "forward",
        recording: {
          id: "r1",
          title: "Original Track",
          "artist-credit": [
            { name: "Original Artist", artist: { id: "a1", name: "Original Artist" } },
          ],
        },
      },
    ];
    const samples = extractSamples(relations);
    expect(samples).toEqual([
      {
        title: "Original Track",
        artist: "Original Artist",
        mbid: "r1",
        direction: "samples",
      },
    ]);
  });

  it("extracts backward (sampled_by) relationships", () => {
    const relations: MBRelation[] = [
      {
        type: "samples material",
        "type-id": "xxx",
        target: "t1",
        direction: "backward",
        recording: {
          id: "r2",
          title: "Sampling Track",
          "artist-credit": [
            { name: "Sampler", artist: { id: "a2", name: "Sampler" } },
          ],
        },
      },
    ];
    const samples = extractSamples(relations);
    expect(samples[0].direction).toBe("sampled_by");
  });

  it("ignores non-sample relations", () => {
    const relations: MBRelation[] = [
      {
        type: "remix",
        "type-id": "xxx",
        target: "t1",
        direction: "forward",
        recording: {
          id: "r3",
          title: "Remix",
          "artist-credit": [
            { name: "Remixer", artist: { id: "a3", name: "Remixer" } },
          ],
        },
      },
    ];
    expect(extractSamples(relations)).toHaveLength(0);
  });
});
