import { describe, it, expect } from "vitest";
import {
  albumsCompatible,
  isSuspiciousReleaseTitle,
  pickBestRecording,
  scoreMbRecording,
  type ResolutionCandidate,
} from "@/lib/mapping-quality";

const vonDutchBrat: ResolutionCandidate = {
  id: "brat-recording",
  title: "Von dutch",
  length: 156000,
  artistCredit: [{ name: "Charli xcx" }],
  releases: [
    {
      title: "BRAT",
      releaseGroup: { primaryType: "Album" },
    },
  ],
};

const vonDutchPartygirl: ResolutionCandidate = {
  id: "partygirl-recording",
  title: "Von dutch",
  length: 420000,
  artistCredit: [{ name: "Charli xcx" }],
  releases: [
    {
      title: "Boiler Room & Charli XCX Presents PARTYGIRL",
      releaseGroup: { primaryType: "Album" },
    },
  ],
};

describe("scoreMbRecording", () => {
  it("prefers BRAT studio album over PARTYGIRL DJ mix for Von dutch", () => {
    const bratScore = scoreMbRecording(
      vonDutchBrat,
      "Charli xcx",
      "Von dutch",
      "BRAT",
      156000
    );
    const partygirlScore = scoreMbRecording(
      vonDutchPartygirl,
      "Charli xcx",
      "Von dutch",
      "BRAT",
      156000
    );

    expect(bratScore).toBeGreaterThan(partygirlScore);
    expect(bratScore).toBeGreaterThanOrEqual(45);
    expect(partygirlScore).toBeLessThan(45);
  });
});

describe("pickBestRecording", () => {
  it("selects BRAT and rejects ambiguous low-confidence picks", () => {
    const result = pickBestRecording(
      [vonDutchPartygirl, vonDutchBrat],
      "Charli xcx",
      "Von dutch",
      "BRAT",
      156000
    );

    expect(result.mbid).toBe("brat-recording");
    expect(result.gap).toBeGreaterThanOrEqual(12);
  });
});

describe("albumsCompatible", () => {
  it("treats BRAT and brat as compatible", () => {
    expect(albumsCompatible("BRAT", "brat")).toBe(true);
  });

  it("flags PARTYGIRL as incompatible with BRAT", () => {
    expect(
      albumsCompatible("BRAT", "Boiler Room & Charli XCX Presents PARTYGIRL")
    ).toBe(false);
  });
});

describe("isSuspiciousReleaseTitle", () => {
  it("flags boiler room and partygirl packaging", () => {
    expect(
      isSuspiciousReleaseTitle("Boiler Room & Charli XCX Presents PARTYGIRL")
    ).toBe(true);
    expect(isSuspiciousReleaseTitle("BRAT")).toBe(false);
  });

  it("flags greatest hits compilations", () => {
    expect(isSuspiciousReleaseTitle("Greatest Hits")).toBe(true);
  });
});
