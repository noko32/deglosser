import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCoverArt } from "@/lib/cover-art";

describe("getCoverArt", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns https URL from front image and normalizes http to https", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            images: [
              {
                front: true,
                thumbnails: {
                  "500": "http://coverartarchive.org/release/abc/500.jpg",
                  large: "http://coverartarchive.org/release/abc/large.jpg",
                },
              },
            ],
          }),
      })
    );

    const url = await getCoverArt("abc");
    expect(url).toBe("https://coverartarchive.org/release/abc/500.jpg");
  });

  it("returns null on 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 })
    );

    expect(await getCoverArt("missing")).toBeNull();
  });

  it("returns null on network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error"))
    );

    expect(await getCoverArt("error")).toBeNull();
  });
});
