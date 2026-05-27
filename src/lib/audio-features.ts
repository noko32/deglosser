import type { AudioFeaturesProvider } from "./types";
import { freqBlogProvider } from "./freqblog";

const nullProvider: AudioFeaturesProvider = {
  name: "null",
  async getFeatures() {
    return null;
  },
};

export function createProvider(): AudioFeaturesProvider {
  if (process.env.FREQBLOG_API_KEY) {
    return freqBlogProvider;
  }
  return nullProvider;
}
