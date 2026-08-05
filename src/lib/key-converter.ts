/**
 * Bidirectional helper to convert raw musical keys to standard Camelot codes,
 * and standard Camelot codes back to compatible database query forms.
 */

const KEY_TO_CAMELOT: Record<string, string> = {
  // Minor keys
  "A-MINOR": "8A",
  "A MINOR": "8A",
  "AM": "8A",
  "B-MINOR": "10A",
  "B MINOR": "10A",
  "BM": "10A",
  "C-MINOR": "5A",
  "C MINOR": "5A",
  "CM": "5A",
  "D-MINOR": "7A",
  "D MINOR": "7A",
  "DM": "7A",
  "E-MINOR": "9A",
  "E MINOR": "9A",
  "EM": "9A",
  "F-MINOR": "4A",
  "F MINOR": "4A",
  "FM": "4A",
  "G-MINOR": "6A",
  "G MINOR": "6A",
  "GM": "6A",
  "C#-MINOR": "12A",
  "C# MINOR": "12A",
  "C#M": "12A",
  "DB-MINOR": "12A",
  "DB MINOR": "12A",
  "DBM": "12A",
  "F#-MINOR": "11A",
  "F# MINOR": "11A",
  "F#M": "11A",
  "GB-MINOR": "11A",
  "GB MINOR": "11A",
  "GBM": "11A",
  "G#-MINOR": "1A",
  "G# MINOR": "1A",
  "G#M": "1A",
  "AB-MINOR": "1A",
  "AB MINOR": "1A",
  "ABM": "1A",
  "D#-MINOR": "2A",
  "D# MINOR": "2A",
  "D#M": "2A",
  "EB-MINOR": "2A",
  "EB MINOR": "2A",
  "EBM": "2A",
  "A#-MINOR": "3A",
  "A# MINOR": "3A",
  "A#M": "3A",
  "BB-MINOR": "3A",
  "BB MINOR": "3A",
  "BBM": "3A",

  // Major keys
  "C-MAJOR": "8B",
  "C MAJOR": "8B",
  "C": "8B",
  "D-MAJOR": "10B",
  "D MAJOR": "10B",
  "D": "10B",
  "E-MAJOR": "12B",
  "E MAJOR": "12B",
  "E": "12B",
  "F-MAJOR": "7B",
  "F MAJOR": "7B",
  "F": "7B",
  "G-MAJOR": "9B",
  "G MAJOR": "9B",
  "G": "9B",
  "A-MAJOR": "11B",
  "A MAJOR": "11B",
  "A": "11B",
  "B-MAJOR": "1B",
  "B MAJOR": "1B",
  "B": "1B",
  "F#-MAJOR": "2B",
  "F# MAJOR": "2B",
  "F#": "2B",
  "GB-MAJOR": "2B",
  "GB MAJOR": "2B",
  "GB": "2B",
  "C#-MAJOR": "3B",
  "C# MAJOR": "3B",
  "C#": "3B",
  "DB-MAJOR": "3B",
  "DB MAJOR": "3B",
  "DB": "3B",
  "G#-MAJOR": "4B",
  "G# MAJOR": "4B",
  "G#": "4B",
  "AB-MAJOR": "4B",
  "AB MAJOR": "4B",
  "AB": "4B",
  "D#-MAJOR": "5B",
  "D# MAJOR": "5B",
  "D#": "5B",
  "EB-MAJOR": "5B",
  "EB MAJOR": "5B",
  "EB": "5B",
  "A#-MAJOR": "6B",
  "A# MAJOR": "6B",
  "A#": "6B",
  "BB-MAJOR": "6B",
  "BB MAJOR": "6B",
  "BB": "6B",
};

// Camelot codes mapped to multiple database conventions
const CAMELOT_TO_RAW: Record<string, string[]> = {
  "1A": ["G#-Minor", "G# Minor", "Ab-Minor", "Ab Minor"],
  "1B": ["B-Major", "B Major"],
  "2A": ["D#-Minor", "D# Minor", "Eb-Minor", "Eb Minor"],
  "2B": ["F#-Major", "F# Major", "Gb-Major", "Gb Major"],
  "3A": ["A#-Minor", "A# Minor", "Bb-Minor", "Bb Minor"],
  "3B": ["C#-Major", "C# Major", "Db-Major", "Db Major"],
  "4A": ["F-Minor", "F Minor"],
  "4B": ["G#-Major", "G# Major", "Ab-Major", "Ab Major"],
  "5A": ["C-Minor", "C Minor"],
  "5B": ["D#-Major", "D# Major", "Eb-Major", "Eb Major"],
  "6A": ["G-Minor", "G Minor"],
  "6B": ["A#-Major", "A# Major", "Bb-Major", "Bb Major"],
  "7A": ["D-Minor", "D Minor"],
  "7B": ["F-Major", "F Major"],
  "8A": ["A-Minor", "A Minor"],
  "8B": ["C-Major", "C Major"],
  "9A": ["E-Minor", "E Minor"],
  "9B": ["G-Major", "G Major"],
  "10A": ["B-Minor", "B Minor"],
  "10B": ["D-Major", "D Major"],
  "11A": ["F#-Minor", "F# Minor", "Gb-Minor", "Gb Minor"],
  "11B": ["A-Major", "A Major"],
  "12A": ["C#-Minor", "C# Minor", "Db-Minor", "Db Minor"],
  "12B": ["E-Major", "E Major"],
};

export function toCamelot(key: string): string {
  const normalized = key.toUpperCase().replace(/\s+/g, " ").trim();
  
  // If it is already in Camelot format, return it
  if (/^\d+[AB]$/.test(normalized)) {
    return normalized;
  }

  return KEY_TO_CAMELOT[normalized] || normalized;
}

export function getDbMatchingKeys(camelotKeys: string[]): string[] {
  const result: string[] = [];
  for (const k of camelotKeys) {
    const upperK = k.toUpperCase().trim();
    result.push(upperK);
    const raws = CAMELOT_TO_RAW[upperK];
    if (raws) {
      result.push(...raws);
    }
  }
  return result;
}
