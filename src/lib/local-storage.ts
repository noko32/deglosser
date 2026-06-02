export interface FavoriteSong {
  mbid: string;
  title: string;
  artist: string;
  coverArtUrl: string | null;
  favoritedAt: number;
}

export interface RecentSearch {
  query: string;
  searchedAt: number;
}

const FAVORITES_KEY = "deglosser-favorites";
const SEARCHES_KEY = "deglosser-recent-searches";
const MAX_RECENT_SEARCHES = 10;

export function getFavorites(): FavoriteSong[] {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
  } catch {
    return [];
  }
}

export function isFavorited(mbid: string): boolean {
  return getFavorites().some((f) => f.mbid === mbid);
}

export function toggleFavorite(
  song: Omit<FavoriteSong, "favoritedAt">
): boolean {
  const favs = getFavorites();
  const idx = favs.findIndex((f) => f.mbid === song.mbid);
  if (idx >= 0) {
    favs.splice(idx, 1);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
    return false;
  }
  favs.unshift({ ...song, favoritedAt: Date.now() });
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  return true;
}

export function getRecentSearches(): RecentSearch[] {
  try {
    return JSON.parse(localStorage.getItem(SEARCHES_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string): void {
  const searches = getRecentSearches().filter((s) => s.query !== query);
  searches.unshift({ query, searchedAt: Date.now() });
  localStorage.setItem(
    SEARCHES_KEY,
    JSON.stringify(searches.slice(0, MAX_RECENT_SEARCHES))
  );
}

export function clearRecentSearches(): void {
  localStorage.removeItem(SEARCHES_KEY);
}
