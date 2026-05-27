import type { AudioFeaturesProvider, AudioFeaturesResult } from "./types";

const FREQBLOG_BASE = "https://api.freqblog.com";

export const freqBlogProvider: AudioFeaturesProvider = {
  name: "freqblog",

  async getFeatures({ artist, title }) {
    const apiKey = process.env.FREQBLOG_API_KEY;
    if (!apiKey) return null;

    try {
      const params = new URLSearchParams({ track: title, artist });
      const res = await fetch(`${FREQBLOG_BASE}/lookup?${params}`, {
        headers: { "X-Api-Key": apiKey },
      });

      // 202 = queued for analysis, not ready yet
      if (res.status === 202) return null;
      if (!res.ok) return null;

      const data = await res.json();
      const af = data.audio_features ?? data;

      const result: AudioFeaturesResult = {
        bpm: af.bpm ?? null,
        bpmAlt: af.bpm_alt ?? null,
        key: af.key ?? null,
        camelot: af.camelot ?? null,
        energy: af.energy ?? null,
        danceability: af.danceability ?? null,
        valence: af.valence ?? null,
        mood: af.mood ?? null,
        genre: af.genre ?? null,
        raw: af,
      };

      return result;
    } catch {
      return null;
    }
  },
};
