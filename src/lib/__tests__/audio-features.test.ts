import { describe, it, expect, vi, beforeEach } from "vitest";
import { createProvider } from "@/lib/audio-features";

describe("createProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns freqblog provider when FREQBLOG_API_KEY is set", () => {
    vi.stubEnv("FREQBLOG_API_KEY", "test-key");
    const provider = createProvider();
    expect(provider.name).toBe("freqblog");
  });

  it("returns null provider when FREQBLOG_API_KEY is not set", () => {
    vi.stubEnv("FREQBLOG_API_KEY", "");
    const provider = createProvider();
    expect(provider.name).toBe("null");
  });
});
