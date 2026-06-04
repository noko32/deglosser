import { describe, it, expect, vi, beforeEach } from "vitest";
import { normalize, isCloseMatch, getLyrics } from "@/lib/lrclib";

describe("normalize", () => {
  it("lowercases and strips punctuation", () => {
    expect(normalize("HUMBLE.")).toBe("humble");
  });

  it("preserves spaces between words", () => {
    expect(normalize("Get Lucky")).toBe("get lucky");
  });

  it("strips accents and special characters", () => {
    expect(normalize("Rock & Roll!")).toBe("rock  roll");
  });
});

describe("isCloseMatch", () => {
  it("matches exact (after normalization)", () => {
    expect(isCloseMatch("HUMBLE", "humble")).toBe(true);
  });

  it("matches when candidate contains query", () => {
    expect(isCloseMatch("HUMBLE", "HUMBLE.")).toBe(true);
  });

  it("matches when query contains candidate", () => {
    expect(isCloseMatch("Kendrick Lamar HUMBLE", "Kendrick Lamar")).toBe(true);
  });

  it("returns false for unrelated strings", () => {
    expect(isCloseMatch("Taylor Swift", "Kendrick Lamar")).toBe(false);
  });

  it("returns false for empty strings", () => {
    expect(isCloseMatch("", "something")).toBe(false);
  });
});

describe("getLyrics", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns exact match when available", async () => {
    const mockResponse = {
      plainLyrics: "Be humble\nSit down",
      syncedLyrics: "[00:01] Be humble",
      duration: 180,
      albumName: "DAMN.",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })
    );

    const result = await getLyrics("Kendrick Lamar", "HUMBLE");
    expect(result).toEqual({
      plainLyrics: "Be humble\nSit down",
      syncedLyrics: "[00:01] Be humble",
      duration: 180,
      albumName: "DAMN.",
    });
  });

  it("falls back to search when exact match fails", async () => {
    const searchResults = [
      {
        artistName: "Kendrick Lamar",
        trackName: "HUMBLE.",
        plainLyrics: "Be humble",
        syncedLyrics: null,
        duration: 180,
        albumName: "DAMN.",
      },
    ];

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(searchResults),
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getLyrics("Kendrick Lamar", "HUMBLE");
    expect(result).not.toBeNull();
    expect(result?.plainLyrics).toBe("Be humble");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns null when both exact and search fail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false })
    );

    const result = await getLyrics("Unknown", "Nonexistent");
    expect(result).toBeNull();
  });
});
