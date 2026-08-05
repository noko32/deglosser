export interface AudioFeaturesInput {
  mbid: string;
  artist: string;
  title: string;
}

export interface AudioFeaturesResult {
  bpm: number | null;
  bpmAlt: number | null;
  key: string | null;
  camelot: string | null;
  energy: number | null;
  danceability: number | null;
  valence: number | null;
  mood: string | null;
  genre: string | null;
  raw: Record<string, unknown>;
  status?: "success" | "queued";
}

export interface AudioFeaturesProvider {
  name: string;
  getFeatures(input: AudioFeaturesInput): Promise<AudioFeaturesResult | null>;
}

export interface Credit {
  name: string;
  role: string;
  source: "musicbrainz" | "discogs";
}

export interface SampleRelationship {
  title: string;
  artist: string;
  mbid: string;
  direction: "samples" | "sampled_by";
}

export interface DiscogsCredit {
  name: string;
  role: string;
  anv?: string;
}

export interface DiscogsVideo {
  title: string;
  uri: string;
  duration: number;
}

export interface DiscogsEnrichment {
  releaseCredits: DiscogsCredit[];
  trackCredits: DiscogsCredit[];
  genres: string[];
  styles: string[];
  labels: string[];
  videos?: DiscogsVideo[];
}

export interface SongData {
  mbid: string;
  title: string;
  artist: string;
  albumTitle: string | null;
  albumMbid: string | null;
  releaseDate: string | null;
  durationMs: number | null;
  coverArtUrl: string | null;
  lyrics: string | null;
  syncedLyrics: string | null;
  bpm: number | null;
  musicalKey: string | null;
  audioFeatures: AudioFeaturesResult | null;
  credits: Credit[];
  sampleRelationships: SampleRelationship[];
  discogsEnrichment: DiscogsEnrichment | null;
  metadata: Record<string, unknown>;
}

// MusicBrainz enriched recording response shape
export interface MBRelation {
  type: string;
  "type-id": string;
  target: string;
  direction: "forward" | "backward";
  attributes?: string[];
  artist?: {
    id: string;
    name: string;
    "sort-name": string;
  };
  recording?: {
    id: string;
    title: string;
    "artist-credit"?: { name: string; artist: { id: string; name: string } }[];
  };
  work?: {
    id: string;
    title: string;
    relations?: MBRelation[];
  };
}

export interface MBRelease {
  id: string;
  title: string;
  date?: string;
  country?: string;
  "release-group"?: {
    "primary-type"?: string;
    "secondary-types"?: string[];
  };
}

export interface MBRecordingDetail {
  id: string;
  title: string;
  length?: number;
  "artist-credit": { name: string; artist: { id: string; name: string } }[];
  releases: MBRelease[];
  relations: MBRelation[];
}

export interface ITunesMapping {
  itunesTrackId: string;
  mbid: string;
  title: string;
  artist: string;
  albumTitle?: string | null;
  coverArtUrl: string | null;
  durationMs: number | null;
  previewUrl: string | null;
  createdAt?: Date;
}

