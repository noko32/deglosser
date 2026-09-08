"use client";

import { useEffect, useRef } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { ArchipelagoCanvas } from "@/components/ArchipelagoCanvas";
import { DetailsDrawer } from "@/components/DetailsDrawer";
import { ContextualBack } from "@/components/ContextualBack";
import { ShareButton } from "@/components/ShareButton";
import { FavoriteButton } from "@/components/FavoriteButton";
import type { AudioFeaturesResult, Credit, DiscogsEnrichment, SampleRelationship } from "@/lib/types";

interface SongDetailViewProps {
  initialSong: {
    mbid: string;
    title: string;
    artist: string;
    bpm: number;
    musicalKey: string;
    coverArtUrl: string | null;
    isEstimated: boolean;
  };
  songData: {
    mbid: string;
    title: string;
    artist: string;
    coverArtUrl: string | null;
    lyrics: string | null;
    audioFeatures: AudioFeaturesResult | null;
    credits: Credit[];
    discogsEnrichment: DiscogsEnrichment | null;
    sampleRelationships: SampleRelationship[];
    releaseDate: string | null;
    albumTitle: string | null;
    durationMs: number | null;
  };
  from?: string;
}

export function SongDetailView({ initialSong, songData, from }: SongDetailViewProps) {
  const { setDrawerState, closeYoutube } = usePlayer();

  // Clear any active global YouTube player on mount
  const didCleanup = useRef(false);
  useEffect(() => {
    if (!didCleanup.current) {
      didCleanup.current = true;
      closeYoutube();
    }
  });

  const { drawerState } = usePlayer();
  const isDrawerExpanded = drawerState === "expanded";

  const handleNodeClick = () => {
    // Always expand drawer when a node is tapped
    setDrawerState("expanded");
  };

  return (
    <div className="fixed inset-0 top-[52px] flex flex-col lg:flex-row">
      {/* Floating nav bar */}
      <div className="absolute top-2 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto">
          <ContextualBack
            from={from}
            className="text-xs font-medium text-dg-text-secondary hover:text-dg-text bg-dg-surface-elevated/80 hover:bg-dg-surface-elevated border border-dg-border-glass backdrop-blur-sm px-3 py-1.5 rounded-lg transition-all"
          />
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
          <ShareButton mbid={initialSong.mbid} />
          <FavoriteButton
            song={{
              mbid: initialSong.mbid,
              title: initialSong.title,
              artist: initialSong.artist,
              coverArtUrl: initialSong.coverArtUrl,
            }}
          />
        </div>
      </div>

      {/* Spider-Net Canvas */}
      <div className="flex-1 relative min-h-0">
        <ArchipelagoCanvas
          initialSong={initialSong}
          onNodeClick={handleNodeClick}
        />
      </div>

      {/* Desktop expand toggle */}
      <button
        onClick={() => setDrawerState("expanded")}
        className={`hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 z-40 bg-dg-surface-elevated/80 hover:bg-dg-surface-elevated border border-dg-border-glass text-dg-text-secondary hover:text-dg-text px-1.5 py-6 rounded-l-lg backdrop-blur-sm transition-all duration-200 hover:scale-105 active:scale-95 ${isDrawerExpanded ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        title="Expand song details"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
      </button>

      {/* Details Drawer, bottom sheet on mobile, side panel on desktop */}
      <DetailsDrawer songData={songData} />
    </div>
  );
}
