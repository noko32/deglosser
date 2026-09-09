"use client";

import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import type { DiscogsVideo } from "@/lib/types";

export interface PlaybackTrack {
  id: string | number;
  title: string;
  artist: string;
  coverArtUrl: string | null;
  previewUrl: string;
}

interface PlayerContextType {
  currentTrack: PlaybackTrack | null;
  isPlaying: boolean;
  volume: number;
  playTrack: (track: PlaybackTrack) => void;
  pauseTrack: () => void;
  togglePlayback: () => void;
  setVolume: (vol: number) => void;
  activeYoutubeId: string | null;
  youtubeTitle: string | null;
  isYoutubeOpen: boolean;
  youtubeAlternativeVideos: DiscogsVideo[];
  playYoutube: (videoId: string, title: string, alternativeVideos?: DiscogsVideo[]) => void;
  closeYoutube: () => void;
  setYoutubeOpen: (open: boolean) => void;
  activeSongMbid: string | null;
  activeSongTitle: string | null;
  activeSongArtist: string | null;
  activeSongCoverArtUrl: string | null;
  setActiveSong: (mbid: string, title: string, artist: string, coverArtUrl?: string | null) => void;

  // Drawer state (persisted to localStorage)
  drawerState: "minimized" | "expanded";
  setDrawerState: (state: "minimized" | "expanded") => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<PlaybackTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.4);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Global YouTube Player states
  const [activeYoutubeId, setActiveYoutubeId] = useState<string | null>(null);
  const [youtubeTitle, setYoutubeTitle] = useState<string | null>(null);
  const [isYoutubeOpen, setIsYoutubeOpen] = useState(false);
  const [youtubeAlternativeVideos, setYoutubeAlternativeVideos] = useState<DiscogsVideo[]>([]);

  const [activeSongMbid, setActiveSongMbid] = useState<string | null>(null);
  const [activeSongTitle, setActiveSongTitle] = useState<string | null>(null);
  const [activeSongArtist, setActiveSongArtist] = useState<string | null>(null);
  const [activeSongCoverArtUrl, setActiveSongCoverArtUrl] = useState<string | null>(null);

  const [drawerState, setDrawerStateInternal] = useState<"minimized" | "expanded">("minimized");
  const didHydrateDrawer = useRef(false);
  useEffect(() => {
    if (didHydrateDrawer.current) return;
    didHydrateDrawer.current = true;
    try {
      const saved = localStorage.getItem("drawer-state");
      if (saved === "expanded") {
        setTimeout(() => {
          setDrawerStateInternal("expanded");
        }, 0);
      }
    } catch { }
  }, []);

  // Initialize or re-configure Audio object when currentTrack changes
  useEffect(() => {
    if (!currentTrack) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(currentTrack.previewUrl);
    audioRef.current = audio;
    audio.volume = volume;

    if (isPlaying) {
      audio.play().catch((err) => {
        console.error("Audio playback failed:", err);
        setIsPlaying(false);
      });
    }

    audio.onended = () => {
      setIsPlaying(false);
    };

    return () => {
      audio.pause();
      audio.onended = null;
    };
  }, [currentTrack]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep volume in sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const playTrack = (track: PlaybackTrack) => {
    setActiveYoutubeId(null);
    setIsYoutubeOpen(false);

    if (currentTrack?.previewUrl === track.previewUrl) {
      if (!isPlaying) {
        setIsPlaying(true);
        audioRef.current?.play().catch(() => setIsPlaying(false));
      }
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  const pauseTrack = () => {
    setIsPlaying(false);
    audioRef.current?.pause();
  };

  const togglePlayback = () => {
    if (!currentTrack) return;
    if (isPlaying) {
      pauseTrack();
    } else {
      setIsPlaying(true);
      audioRef.current?.play().catch(() => setIsPlaying(false));
    }
  };

  const setVolume = (vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
  };

  // YouTube Helpers
  const playYoutube = (videoId: string, title: string, alternativeVideos: DiscogsVideo[] = []) => {
    pauseTrack();

    setActiveYoutubeId(videoId);
    setYoutubeTitle(title);
    setIsYoutubeOpen(true);
    if (alternativeVideos.length > 0) {
      setYoutubeAlternativeVideos(alternativeVideos);
    }
  };

  const closeYoutube = () => {
    setActiveYoutubeId(null);
    setYoutubeTitle(null);
    setIsYoutubeOpen(false);
    setYoutubeAlternativeVideos([]);
  };

  const setYoutubeOpen = (open: boolean) => {
    setIsYoutubeOpen(open);
  };

  const setActiveSong = (mbid: string, title: string, artist: string, coverArtUrl?: string | null) => {
    setActiveSongMbid(mbid);
    setActiveSongTitle(title);
    setActiveSongArtist(artist);
    setActiveSongCoverArtUrl(coverArtUrl ?? null);
  };

  const setDrawerState = (state: "minimized" | "expanded") => {
    setDrawerStateInternal(state);
    try {
      localStorage.setItem("drawer-state", state);
      document.documentElement.setAttribute("data-drawer", state);
    } catch { }
  };

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        volume,
        playTrack,
        pauseTrack,
        togglePlayback,
        setVolume,
        activeYoutubeId,
        youtubeTitle,
        isYoutubeOpen,
        youtubeAlternativeVideos,
        playYoutube,
        closeYoutube,
        setYoutubeOpen,
        activeSongMbid,
        activeSongTitle,
        activeSongArtist,
        activeSongCoverArtUrl,
        setActiveSong,
        drawerState,
        setDrawerState,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}
