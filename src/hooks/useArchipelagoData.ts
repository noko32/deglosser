import { useState, useEffect } from "react";
import { usePlayer } from "@/context/PlayerContext";

export interface ArchipelagoSong {
  mbid: string;
  title: string;
  artist: string;
  bpm: number | null;
  musicalKey: string | null;
  coverArtUrl: string | null;
}

export function useArchipelagoData(
  initialSong: ArchipelagoSong & { isEstimated: boolean },
  onNodeClick?: (song: ArchipelagoSong) => void
) {
  const { setActiveSong } = usePlayer();

  const [centerSong, setCenterSong] = useState<ArchipelagoSong & { isEstimated: boolean }>(initialSong);
  const [recommendations, setRecommendations] = useState<ArchipelagoSong[]>([]);
  const [history, setHistory] = useState<ArchipelagoSong[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoveredSong, setHoveredSong] = useState<ArchipelagoSong | null>(null);

  // Fetch recommendations whenever centerSong changes
  useEffect(() => {
    const fetchRecs = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          mbid: centerSong.mbid,
          bpm: centerSong.bpm!.toString(),
          key: centerSong.musicalKey!,
        });
        if (centerSong.isEstimated) params.set("estimated", "true");

        const res = await fetch(`/api/recommendations?${params}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (data.status === "success") {
          setRecommendations(data.recommendations || []);
        }
      } catch (err) {
        console.error("Error fetching archipelago recommendations:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecs();
  }, [centerSong]);

  // Set the initial active song in context
  useEffect(() => {
    setActiveSong(initialSong.mbid, initialSong.title, initialSong.artist, initialSong.coverArtUrl);
  }, [initialSong.mbid]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNodeClick = (song: ArchipelagoSong) => {
    if (loading) return;
    setHistory((prev) => [...prev, centerSong]);
    const newCenter = { ...song, isEstimated: !song.bpm || !song.musicalKey };
    setCenterSong(newCenter);
    setActiveSong(song.mbid, song.title, song.artist, song.coverArtUrl);
    onNodeClick?.(song);
  };

  const handleBackClick = () => {
    if (history.length === 0 || loading) return;
    const newHistory = [...history];
    const prev = newHistory.pop()!;
    setHistory(newHistory);
    const restored = { ...prev, isEstimated: !prev.bpm || !prev.musicalKey };
    setCenterSong(restored);
    setActiveSong(prev.mbid, prev.title, prev.artist, prev.coverArtUrl);
    onNodeClick?.(prev);
  };

  return {
    centerSong,
    recommendations,
    history,
    loading,
    hoveredSong,
    setHoveredSong,
    handleNodeClick,
    handleBackClick,
  };
}
