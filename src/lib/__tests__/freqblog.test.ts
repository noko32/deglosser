import { describe, it, expect, vi, beforeEach } from "vitest";
import { freqBlogProvider } from "@/lib/freqblog";

const INPUT = { mbid: "abc", artist: "Kendrick Lamar", title: "HUMBLE" };

describe("freqBlogProvider.getFeatures", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns null when FREQBLOG_API_KEY is not set", async () => {
    vi.stubEnv("FREQBLOG_API_KEY", "");
    expect(await freqBlogProvider.getFeatures(INPUT)).toBeNull();
  });

  it("returns queued status object on 202 (queued for analysis)", async () => {
    vi.stubEnv("FREQBLOG_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 202 })
    );

    const result = await freqBlogProvider.getFeatures(INPUT);
    expect(result).toEqual({
      bpm: null,
      bpmAlt: null,
      key: null,
      camelot: null,
      energy: null,
      danceability: null,
      valence: null,
      mood: null,
      genre: null,
      raw: {},
      status: "queued"
    });
  });

  it("maps response fields correctly on success", async () => {
    vi.stubEnv("FREQBLOG_API_KEY", "test-key");
    const apiResponse = {
      audio_features: {
        bpm: 150,
        bpm_alt: 75,
        key: "C# Minor",
        camelot: "5A",
        energy: 0.85,
        danceability: 0.72,
        valence: 0.35,
        mood: "Aggressive",
        genre: "Hip-Hop",
      },
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(apiResponse),
      })
    );

    const result = await freqBlogProvider.getFeatures(INPUT);
    expect(result).not.toBeNull();
    expect(result?.bpm).toBe(150);
    expect(result?.key).toBe("C# Minor");
    expect(result?.energy).toBe(0.85);
    expect(result?.mood).toBe("Aggressive");
    expect(result?.raw).toEqual(apiResponse.audio_features);
  });
});
