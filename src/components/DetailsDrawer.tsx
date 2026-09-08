"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { InlinePlayerHeader } from "./InlinePlayerHeader";
import { VideoReportModal } from "./VideoReportModal";
import { LyricsPanel } from "./LyricsPanel";
import { AudioFeatures } from "./AudioFeatures";
import { CreditsBlock } from "./CreditsBlock";
import { SamplesBlock } from "./SamplesBlock";
import type { AudioFeaturesResult, Credit, DiscogsEnrichment, SampleRelationship, DiscogsVideo } from "@/lib/types";

interface DrawerSongData {
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
}

interface DetailsDrawerProps {
  songData: DrawerSongData;
}

type TabId = "lyrics" | "features" | "credits";

function getYouTubeId(uri: string): string | null {
  try {
    const match = uri.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    return match && match[2].length === 11 ? match[2] : null;
  } catch { return null; }
}

interface QueryContext {
  parts: string[];
  isRemix: boolean;
}

const REMIX_QUERY_REGEX = /\bremix\b|\bmix\b|\bfeat\b|\bft\b/i;
const REMIX_TITLE_REGEX = /\bremix\b/i;
const SPLIT_QUERY_REGEX = /\s*-\s*|\s+/;
const EMPTY_VIDEOS: DiscogsVideo[] = [];

function scoreVideo(title: string, ctx?: QueryContext): number {
  const t = title.toLowerCase();
  let score = 0;

  // Keyword score checks
  if (t.includes("official audio")) score += 12;
  if (t.includes("lyric")) score += 10;
  if (t.includes("audio") && !t.includes("music video")) score += 6;
  if (t.includes("radio")) score += 4;
  if (t.includes("official video") || t.includes("official music video")) score += 3;
  if (t.includes("music video")) score += 2;
  if (t.includes("explicit") || t.includes("uncensored")) score -= 2;
  if (t.includes("live") || t.includes("performance")) score -= 1;

  if (ctx) {
    for (const part of ctx.parts) {
      if (t.includes(part)) score += 2;
    }
    if (!ctx.isRemix && REMIX_TITLE_REGEX.test(t)) {
      score -= 20;
    }
  }
  return score;
}

export function DetailsDrawer({ songData: initialSongData }: DetailsDrawerProps) {
  const { drawerState, setDrawerState, activeSongMbid, activeSongCoverArtUrl, closeYoutube } = usePlayer();
  const [activeTab, setActiveTab] = useState<TabId>("lyrics");
  const [showReport, setShowReport] = useState(false);
  const [liveSongData, setLiveSongData] = useState<DrawerSongData>(initialSongData);
  const [isLoading, setIsLoading] = useState(false);
  const [videoOverride, setVideoOverride] = useState<string | null>(null);
  const fetchRef = useRef<string | null>(null);

  // Fetch video override for a given mbid
  const fetchOverride = (mbid: string, signal?: AbortSignal) =>
    fetch(`/api/video-report?mbid=${mbid}`, { signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const vid = data?.override?.videoId;
        return vid && vid !== "__flagged__" ? vid : null;
      })
      .catch(() => null);

  useEffect(() => {
    if (!activeSongMbid || activeSongMbid === liveSongData.mbid) return;

    const abortController = new AbortController();
    fetchRef.current = activeSongMbid;
    
    setTimeout(() => {
      if (fetchRef.current === activeSongMbid) {
        setIsLoading(true);
        setVideoOverride(null);
      }
    }, 0);

    closeYoutube();

    Promise.all([
      fetch(`/api/song/${activeSongMbid}`, { signal: abortController.signal })
        .then((res) => (res.ok ? res.json() : null)),
      fetchOverride(activeSongMbid, abortController.signal),
    ])
      .then(([data, override]) => {
        if (fetchRef.current === activeSongMbid) {
          if (data) {
            setLiveSongData(data);
            setActiveTab("lyrics");
          }
          setVideoOverride(override);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") setIsLoading(false);
      });

    return () => { abortController.abort(); };
  }, [activeSongMbid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch override for the initial song on mount
  useEffect(() => {
    fetchOverride(initialSongData.mbid).then(setVideoOverride);
  }, [initialSongData.mbid]);

  const songData = liveSongData;
  const isExpanded = drawerState === "expanded";

  const toggleDrawer = () => {
    setDrawerState(isExpanded ? "minimized" : "expanded");
  };

  // Resolve best video
  const queryFallback = `${songData.artist} - ${songData.title}`;
  const videos = songData.discogsEnrichment?.videos ?? EMPTY_VIDEOS;
  const bestVideo = useMemo(() => {
    if (videoOverride) {
      return {
        video: { uri: `https://www.youtube.com/watch?v=${videoOverride}`, title: "User correction" } as DiscogsVideo,
        id: videoOverride,
        score: 999,
      };
    }

    const parts = queryFallback.toLowerCase().split(SPLIT_QUERY_REGEX).filter((p) => p.length > 2).slice(0, 4);
    const isRemix = REMIX_QUERY_REGEX.test(queryFallback);
    const ctx: QueryContext = { parts, isRemix };

    const playable = videos
      .map((v) => ({ video: v, id: getYouTubeId(v.uri), score: scoreVideo(v.title, ctx) }))
      .filter((item) => item.id !== null)
      .sort((a, b) => b.score - a.score);
    return playable[0] || null;
  }, [videos, queryFallback, videoOverride]);

  // Available tabs
  const availableTabs = useMemo(() => {
    const tabs: { id: TabId; label: string }[] = [];
    if (songData.lyrics) tabs.push({ id: "lyrics", label: "Lyrics" });
    if (songData.audioFeatures) tabs.push({ id: "features", label: "Audio Features" });
    if (songData.credits.length > 0 || songData.discogsEnrichment) tabs.push({ id: "credits", label: "Credits" });
    return tabs;
  }, [songData.lyrics, songData.audioFeatures, songData.credits.length, songData.discogsEnrichment]);

  const effectiveTab = availableTabs.find(t => t.id === activeTab) ? activeTab : (availableTabs[0]?.id || null);

  return (
    <>
      <div
        className={`
          details-drawer--mobile
          lg:relative lg:h-full lg:border-dg-border-glass
          fixed left-0 right-0 bottom-0 lg:left-auto lg:right-auto lg:bottom-auto
          z-50 lg:z-40
          bg-dg-bg/95 backdrop-blur-2xl
          border-t border-dg-border-glass lg:border-t-0
          rounded-t-2xl lg:rounded-none
          flex flex-col
          will-change-transform
          lg:transition-[width] lg:duration-300
          ${isExpanded
            ? "lg:w-[420px] lg:border-l"
            : "lg:w-0 lg:border-l-0 lg:overflow-hidden"
          }
        `}
        style={{
          height: "85vh",
          transform: isExpanded
            ? "translateY(0)"
            : "translateY(calc(100% - 76px))",
          transition: "transform 350ms cubic-bezier(0.25,0.8,0.25,1)",
        }}
      >
        {/* Mobile inline player header */}
        <InlinePlayerHeader onToggle={toggleDrawer} isExpanded={isExpanded} />

        {/* Desktop header */}
        <div className="hidden lg:flex px-5 py-3 items-center justify-between border-b border-dg-border-glass/50">
          <h2 className="text-sm font-bold text-dg-text tracking-wide">Song Details</h2>
          <button
            onClick={toggleDrawer}
            className="text-[10px] text-dg-text-muted hover:text-dg-text transition-colors px-2 py-1 rounded border border-dg-border-glass"
          >
            {isExpanded ? "Collapse" : "Expand"}
          </button>
        </div>

        {/* Song identity */}
        <div className="px-4 pt-3 pb-1 flex items-center gap-3 flex-shrink-0">
          {activeSongCoverArtUrl && (
            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 relative border border-dg-border-glass">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={activeSongCoverArtUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-dg-text truncate">{songData.title}</h3>
            <p className="text-xs text-dg-text-secondary truncate">{songData.artist}</p>
          </div>
        </div>

        {/* Video dock */}
        <div className="px-4 pt-3 flex-shrink-0">
          {bestVideo?.id ? (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black border border-dg-border-glass group">
              <iframe
                src={`https://www.youtube.com/embed/${bestVideo.id}?controls=1&playsinline=1&rel=0`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 w-full h-full z-10"
              />
              {/* Report button */}
              <button
                onClick={() => setShowReport(true)}
                className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity bg-black/60 hover:bg-black/80 text-dg-text-muted hover:text-red-400 p-1.5 rounded-lg backdrop-blur-sm border border-white/10"
                title="Report incorrect video"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M3 2.25a.75.75 0 0 1 .75.75v.54l1.838-.46a9.75 9.75 0 0 1 6.725.738l.108.054a8.25 8.25 0 0 0 5.58.652l.96-.24a.75.75 0 0 1 .921.727v8.769a.75.75 0 0 1-.53.718c-.21.066-.44.13-.67.192a9.75 9.75 0 0 1-5.78-.45l-.108-.054a8.25 8.25 0 0 0-5.725-.634L3.75 14.33V21a.75.75 0 0 1-1.5 0V3A.75.75 0 0 1 3 2.25Z" clipRule="evenodd" />
                </svg>
              </button>
              {/* Source label */}
              <div className="absolute bottom-2 left-2 z-20 pointer-events-none text-[9px] font-semibold uppercase tracking-wider text-white/70 bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/10">
                YouTube · Discogs
              </div>
            </div>
          ) : (
            <div className="w-full aspect-video rounded-lg bg-dg-surface-elevated border border-dg-border-glass flex items-center justify-center relative overflow-hidden">
              {activeSongCoverArtUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={activeSongCoverArtUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 blur-sm" />
              )}
              <div className="relative text-center z-10">
                <p className="text-xs text-dg-text-muted">No video available</p>
                <p className="text-[10px] text-dg-text-muted/60 mt-1">30s preview in footer</p>
              </div>
            </div>
          )}
        </div>

        {/* Tab bar */}
        {availableTabs.length > 0 && (
          <div className="px-4 pt-3 flex-shrink-0">
            <div className="flex gap-1 bg-dg-surface-elevated/30 rounded-lg p-0.5">
              {availableTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all ${effectiveTab === tab.id
                    ? "bg-dg-accent-violet/10 text-dg-accent-violet border border-dg-accent-violet/20"
                    : "text-dg-text-muted hover:text-dg-text"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Scrollable content */}
        <div
          className="flex-1 overflow-y-auto px-4 pb-24 pt-3 relative"
          style={{ touchAction: "pan-y", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-dg-bg/60 backdrop-blur-sm z-10">
              <div className="flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-dg-accent-violet/30 border-t-dg-accent-violet rounded-full animate-spin" />
                <p className="text-[10px] text-dg-text-muted">Loading details…</p>
              </div>
            </div>
          )}
          {effectiveTab === "lyrics" && songData.lyrics && (
            <LyricsPanel lyrics={songData.lyrics} />
          )}

          {effectiveTab === "features" && songData.audioFeatures && (
            <AudioFeatures
              key={songData.mbid}
              features={songData.audioFeatures}
              mbid={songData.mbid}
              artist={songData.artist}
              title={songData.title}
            />
          )}

          {effectiveTab === "credits" && (
            <div className="space-y-4">
              <CreditsBlock credits={songData.credits} discogs={songData.discogsEnrichment} />
              {songData.sampleRelationships.length > 0 && (
                <SamplesBlock samples={songData.sampleRelationships} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Report modal */}
      {showReport && (
        <VideoReportModal
          songMbid={songData.mbid}
          songTitle={songData.title}
          currentVideoId={bestVideo?.id ?? null}
          onClose={() => setShowReport(false)}
          onReportSaved={() => {
            fetchOverride(songData.mbid).then(setVideoOverride);
          }}
        />
      )}
    </>
  );
}
