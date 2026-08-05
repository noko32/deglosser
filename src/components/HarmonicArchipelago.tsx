"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import type { SongData } from "@/lib/types";
import { GenerativeHarmonicCover } from "./GenerativeHarmonicCover";

interface ArchipelagoSong {
  mbid: string;
  title: string;
  artist: string;
  bpm: number | null;
  musicalKey: string | null;
  coverArtUrl: string | null;
}

interface HarmonicArchipelagoProps {
  initialSong: ArchipelagoSong;
}

// Convert degrees to radians
const rad = (deg: number) => (deg * Math.PI) / 180;

export function HarmonicArchipelago({ initialSong }: HarmonicArchipelagoProps) {
  const [isActive, setIsActive] = useState(false);
  const [centerSong, setCenterSong] = useState<ArchipelagoSong>(initialSong);
  const [recommendations, setRecommendations] = useState<ArchipelagoSong[]>([]);
  const [history, setHistory] = useState<ArchipelagoSong[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoveredSong, setHoveredSong] = useState<ArchipelagoSong | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Dimensions of virtual coordinate space
  const size = 600;
  const center = size / 2;

  // Fetch recommendations whenever centerSong changes
  useEffect(() => {
    if (!centerSong.bpm || !centerSong.musicalKey) return;

    const fetchRecs = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          mbid: centerSong.mbid,
          bpm: centerSong.bpm!.toString(),
          key: centerSong.musicalKey!,
        });
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

  if (!centerSong.bpm || !centerSong.musicalKey) {
    return null;
  }

  // Group recommendations into 4 branches based on Camelot key relationship
  const getRelationType = (recKey: string | null, centerKey: string | null): "same" | "prev" | "next" | "relative" | "other" => {
    if (!recKey || !centerKey) return "other";
    const rKey = recKey.toUpperCase().trim();
    const cKey = centerKey.toUpperCase().trim();
    if (rKey === cKey) return "same";

    const rMatch = rKey.match(/^(\d+)([AB])$/);
    const cMatch = cKey.match(/^(\d+)([AB])$/);
    if (!rMatch || !cMatch) return "other";

    const rNum = parseInt(rMatch[1], 10);
    const rLetter = rMatch[2];
    const cNum = parseInt(cMatch[1], 10);
    const cLetter = cMatch[2];

    const prevNum = cNum === 1 ? 12 : cNum - 1;
    const nextNum = cNum === 12 ? 1 : cNum + 1;

    if (rLetter === cLetter) {
      if (rNum === prevNum) return "prev";
      if (rNum === nextNum) return "next";
    } else if (rNum === cNum) {
      return "relative";
    }

    return "other";
  };

  // Define angles for the 4 compatible branches
  const branchConfigs = {
    same: { angle: -45, label: "Perfect Mix", sub: "Same Key", color: "from-emerald-500 to-teal-400" },
    prev: { angle: -135, label: "Energy Down", sub: "Tempo Stagger", color: "from-blue-500 to-indigo-400" },
    next: { angle: 45, label: "Energy Up", sub: "Build Power", color: "from-red-500 to-orange-400" },
    relative: { angle: 135, label: "Mood Shift", sub: "Major/Minor Swap", color: "from-purple-500 to-fuchsia-400" },
    other: { angle: 90, label: "Loose Match", sub: "Adjacent", color: "from-gray-500 to-slate-400" },
  };

  // Group recommendations into 4 branches based on Camelot key relationship
  const getBranchTargetKey = (relation: string, centerKey: string | null): string => {
    if (!centerKey) return "";
    const cKey = centerKey.toUpperCase().trim();
    const match = cKey.match(/^(\d+)([AB])$/);
    if (!match) return "";

    const num = parseInt(match[1], 10);
    const letter = match[2];
    
    if (relation === "same") return cKey;
    if (relation === "relative") {
      const oppositeLetter = letter === "A" ? "B" : "A";
      return `${num}${oppositeLetter}`;
    }
    
    const prevNum = num === 1 ? 12 : num - 1;
    const nextNum = num === 12 ? 1 : num + 1;
    
    if (relation === "prev") return `${prevNum}${letter}`;
    if (relation === "next") return `${nextNum}${letter}`;
    
    return "";
  };

  // Categorize recommended songs into branches
  const categorizedNodes: { song: ArchipelagoSong; x: number; y: number; branch: string; color: string }[] = [];
  const branchCounts: Record<string, number> = { same: 0, prev: 0, next: 0, relative: 0, other: 0 };

  recommendations.forEach((song) => {
    const relation = getRelationType(song.musicalKey, centerSong.musicalKey);
    const config = branchConfigs[relation] || branchConfigs.other;
    const count = branchCounts[relation]++;

    // Compute polar coordinates
    const baseAngle = config.angle;
    // Stagger angle slightly for multiple nodes on the same branch to avoid overlapping
    const staggerAngle = baseAngle + (count % 2 === 0 ? 1 : -1) * Math.min(count * 15, 25);
    // Expand radius outwards for subsequent songs (wider spacing for clearer positioning)
    const radius = 165 + Math.floor(count / 2) * 85 + (count % 2) * 20;

    const radAngle = rad(staggerAngle);
    const x = center + radius * Math.cos(radAngle);
    const y = center + radius * Math.sin(radAngle);

    categorizedNodes.push({
      song,
      x,
      y,
      branch: relation,
      color: config.color,
    });
  });

  // Calculate Key Header coordinates (intermediate branching hubs)
  const branchHeaders = Object.entries(branchConfigs).map(([key, config]) => {
    const radius = 115; // Shifted further out from 95 to create comfortable spacing
    const radAngle = rad(config.angle);
    const targetKey = getBranchTargetKey(key, centerSong.musicalKey);
    return {
      key,
      label: config.label,
      sub: targetKey ? `${config.sub} [${targetKey}]` : config.sub,
      color: config.color,
      x: center + radius * Math.cos(radAngle),
      y: center + radius * Math.sin(radAngle),
    };
  });

  const handleBackClick = () => {
    if (history.length === 0 || loading) return;
    const newHistory = [...history];
    const prev = newHistory.pop()!;
    setHistory(newHistory);
    setCenterSong(prev);
  };

  const handleNodeClick = (song: ArchipelagoSong) => {
    if (loading) return;
    setHistory((prev) => [...prev, centerSong]);
    setCenterSong(song);
  };

  return (
    <>
      {/* Trigger Button - Renders in page flow */}
      <button
        onClick={() => setIsActive(true)}
        className="w-full mt-4 group relative overflow-hidden rounded-xl border border-dg-accent-violet/20 bg-gradient-to-r from-dg-surface-elevated/20 via-dg-surface-elevated/40 to-dg-surface-elevated/20 p-4 sm:p-5 text-left transition-all hover:scale-[1.01] hover:shadow-lg active:scale-[0.99] duration-300"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-dg-accent-blue/5 via-dg-accent-violet/5 to-dg-accent-blue/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div>
            <h3 className="text-sm font-semibold text-dg-accent-blue uppercase tracking-wider flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-dg-accent-blue opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-dg-accent-blue"></span>
              </span>
              Harmonic Discovery Archipelago
            </h3>
            <p className="text-xs text-dg-text-muted mt-1 max-w-xl">
              Precision Camelot algorithm matches. Click to collapse details and launch the endless spatial Spider-Net discovery visualizer.
            </p>
          </div>
          <span className="self-start sm:self-center bg-dg-accent-blue/10 text-dg-accent-blue hover:bg-dg-accent-blue/20 text-xs px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1">
            Explore Spider-Net
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </span>
        </div>
      </button>

      {/* Immersive Immersive Constellation Overlay */}
      {isActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-dg-bg/95 backdrop-blur-xl animate-[fadeIn_0.3s_ease-out] select-none">
          <div className="absolute inset-0 bg-radial-glow opacity-30 pointer-events-none" />

          {/* Top Panel Controls */}
          <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex items-center justify-between border-b border-dg-text-muted/10 bg-dg-bg/40 backdrop-blur-md z-10">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-sm text-dg-text hover:text-dg-accent-blue font-bold tracking-wider uppercase">
                Melomano
              </Link>
              <span className="text-dg-text-muted text-xs">/</span>
              <span className="text-xs font-semibold text-dg-accent-blue uppercase tracking-widest bg-dg-accent-blue/10 px-2 py-1 rounded">
                Archipelago Engine Active
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Back to previous center song button */}
              {history.length > 0 && (
                <button
                  onClick={handleBackClick}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-lg border border-dg-accent-blue/20 bg-dg-accent-blue/10 text-dg-accent-blue hover:bg-dg-accent-blue/20 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all text-xs font-bold flex items-center gap-1.5"
                  title={`Go back to: ${history[history.length - 1].title}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                  </svg>
                  Back ({history.length})
                </button>
              )}

              <button
                onClick={() => setIsActive(false)}
                className="p-1.5 rounded-lg border border-dg-text-muted/20 text-dg-text-secondary hover:text-dg-text hover:bg-dg-surface-elevated/40 hover:scale-105 active:scale-95 transition-all"
                title="Collapse Constellation View"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Endless Archipelago Space */}
          <div
            ref={containerRef}
            className="relative w-full max-w-[90vw] md:max-w-[700px] aspect-square flex items-center justify-center"
          >
            {/* SVG Spider-Web Vector Connectors */}
            <svg
              viewBox={`0 0 ${size} ${size}`}
              className="absolute inset-0 w-full h-full pointer-events-none z-0"
            >
              {/* Pulse waves emanating from Center */}
              <circle
                cx={center}
                cy={center}
                r="45"
                className="fill-none stroke-dg-accent-violet/10 stroke-1 animate-[ping_3s_infinite]"
              />
              <circle
                cx={center}
                cy={center}
                r="115"
                className="fill-none stroke-dg-text-muted/5 stroke-[0.5] stroke-dasharray-[4,4]"
              />
              <circle
                cx={center}
                cy={center}
                r="210"
                className="fill-none stroke-dg-text-muted/5 stroke-[0.5] stroke-dasharray-[2,4]"
              />

              {/* Connections from Center to Key Headers (Bezier bezier curves) */}
              {branchHeaders.map((header) => {
                const midX = (center + header.x) / 2;
                const midY = (center + header.y) / 2;
                return (
                  <path
                    key={header.key}
                    d={`M ${center} ${center} Q ${midX} ${midY} ${header.x} ${header.y}`}
                    className="fill-none stroke-dg-accent-blue/15 stroke-1.5"
                  />
                );
              })}

              {/* Connections from Key Headers to individual Floating Song Bubbles */}
              {categorizedNodes.map((node, i) => {
                const header = branchHeaders.find((h) => h.key === node.branch);
                if (!header) return null;
                const isHovered = hoveredSong?.mbid === node.song.mbid;
                return (
                  <line
                    key={i}
                    x1={header.x}
                    y1={header.y}
                    x2={node.x}
                    y2={node.y}
                    className={`stroke-gradient transition-all duration-500 ${
                      isHovered
                        ? "stroke-dg-accent-blue/40 stroke-2"
                        : "stroke-dg-text-muted/10 stroke-1"
                    }`}
                  />
                );
              })}
            </svg>

            {/* Render Nodes */}
            <div className="absolute inset-0 w-full h-full z-10 pointer-events-none">
              
              {/* --- MASTER CENTER NODE --- */}
              <div
                style={{
                  left: `${(center / size) * 100}%`,
                  top: `${(center / size) * 100}%`,
                }}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-20 flex flex-col items-center"
              >
                {/* Vinyl Record Centerpiece */}
                <div className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-black/90 p-1 border-2 border-dg-accent-blue shadow-[0_0_30px_rgba(59,130,246,0.3)] ${loading ? "animate-pulse" : "animate-[spin_10s_linear_infinite]"}`}>
                  <div className="absolute inset-0 w-full h-full rounded-full border border-white/5 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black" />
                  
                  {/* Outer grooves */}
                  <div className="absolute inset-2 rounded-full border border-zinc-800/60" />
                  <div className="absolute inset-4 rounded-full border border-zinc-800/40" />
                  <div className="absolute inset-6 rounded-full border border-zinc-800/20" />

                  {/* Album Cover Hub */}
                  <div className="absolute inset-[24px] rounded-full overflow-hidden bg-dg-surface border border-zinc-900 flex items-center justify-center">
                    {(centerSong.coverArtUrl && !failedImages[centerSong.mbid]) ? (
                      <Image
                        src={centerSong.coverArtUrl}
                        alt="Album art"
                        fill
                        className="object-cover animate-[fadeIn_0.5s_ease-out]"
                        unoptimized
                        onError={() => setFailedImages(prev => ({ ...prev, [centerSong.mbid]: true }))}
                      />
                    ) : (
                      <GenerativeHarmonicCover
                        title={centerSong.title}
                        artist={centerSong.artist}
                        musicalKey={centerSong.musicalKey}
                        bpm={centerSong.bpm}
                        size="fluid"
                      />
                    )}
                  </div>

                  {/* Tiny Spindle Hole */}
                  <div className="absolute inset-[calc(50%-4px)] rounded-full bg-zinc-950 border border-zinc-800 shadow-inner z-10" />
                </div>

                {/* Micro Details Badge */}
                <div className="mt-2 bg-dg-bg/90 border border-dg-accent-blue/30 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold text-dg-accent-blue shadow-md flex items-center gap-1">
                  <span>{centerSong.musicalKey}</span>
                  <span className="text-dg-text-muted">•</span>
                  <span>{centerSong.bpm} BPM</span>
                </div>
              </div>

              {/* --- KEY HEADERS (HUB STATIONS) --- */}
              {branchHeaders.map((header) => {
                const nodesInBranch = categorizedNodes.filter(n => n.branch === header.key);
                if (nodesInBranch.length === 0) return null;

                return (
                  <div
                    key={header.key}
                    style={{
                      left: `${(header.x / size) * 100}%`,
                      top: `${(header.y / size) * 100}%`,
                    }}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-30 text-center flex flex-col items-center"
                  >
                    <div className={`px-2 py-1 rounded bg-gradient-to-r ${header.color} text-[9px] font-bold text-black uppercase tracking-wider shadow-md transform hover:scale-105 transition-all`}>
                      {header.label}
                    </div>
                    <span className="text-[8px] text-dg-text-muted mt-0.5 block font-semibold tracking-wide">
                      {header.sub}
                    </span>
                  </div>
                );
              })}

              {/* --- FLOATING SONG BUBBLES --- */}
              {categorizedNodes.map((node, i) => {
                const isHovered = hoveredSong?.mbid === node.song.mbid;
                return (
                  <div
                    key={i}
                    style={{
                      left: `${(node.x / size) * 100}%`,
                      top: `${(node.y / size) * 100}%`,
                    }}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-20 group"
                  >
                    <button
                      onClick={() => handleNodeClick(node.song)}
                      onMouseEnter={() => setHoveredSong(node.song)}
                      onMouseLeave={() => setHoveredSong(null)}
                      className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border bg-dg-surface p-0.5 transition-all duration-500 ease-out hover:scale-110 hover:z-40 active:scale-95 shadow-md flex items-center justify-center ${
                        isHovered
                          ? "border-dg-accent-blue shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-105"
                          : "border-dg-text-muted/20"
                      }`}
                    >
                      <div className="relative w-full h-full rounded-full overflow-hidden bg-dg-surface-elevated">
                        {(node.song.coverArtUrl && !failedImages[node.song.mbid]) ? (
                          <Image
                            src={node.song.coverArtUrl}
                            alt={node.song.title}
                            fill
                            className="object-cover group-hover:rotate-[30deg] transition-transform duration-700 animate-[fadeIn_0.5s_ease-out]"
                            unoptimized
                            onError={() => setFailedImages(prev => ({ ...prev, [node.song.mbid]: true }))}
                          />
                        ) : (
                          <GenerativeHarmonicCover
                            title={node.song.title}
                            artist={node.song.artist}
                            musicalKey={node.song.musicalKey}
                            bpm={node.song.bpm}
                            size="fluid"
                          />
                        )}
                      </div>
                      
                      {/* Miniature key badge on bubble */}
                      <span className="absolute -bottom-1 -right-1 bg-black border border-white/10 px-1 rounded-full text-[7px] font-mono text-dg-text font-bold">
                        {node.song.musicalKey}
                      </span>
                    </button>
                  </div>
                );
              })}

            </div>
          </div>

          {/* Floating HUD Information & Details */}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-dg-bg via-dg-bg/90 to-transparent border-t border-dg-text-muted/5 flex flex-col sm:flex-row items-center justify-between gap-4 z-10">
            {/* Center Song Info */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-dg-text-muted/10 shrink-0 bg-dg-surface flex items-center justify-center">
                {(centerSong.coverArtUrl && !failedImages[centerSong.mbid + "-hud"]) ? (
                  <Image
                    src={centerSong.coverArtUrl}
                    alt={centerSong.title}
                    fill
                    className="object-cover"
                    unoptimized
                    onError={() => setFailedImages(prev => ({ ...prev, [centerSong.mbid + "-hud"]: true }))}
                  />
                ) : (
                  <GenerativeHarmonicCover
                    title={centerSong.title}
                    artist={centerSong.artist}
                    musicalKey={centerSong.musicalKey}
                    bpm={centerSong.bpm}
                    size="fluid"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-bold tracking-widest text-dg-accent-blue">Focused Master Node</span>
                <h3 className="text-sm font-bold text-dg-text truncate line-clamp-1">{centerSong.title}</h3>
                <p className="text-xs text-dg-text-secondary truncate">{centerSong.artist}</p>
              </div>
              <Link
                href={`/song/${centerSong.mbid}`}
                className="bg-dg-surface-elevated/40 hover:bg-dg-surface-elevated border border-dg-text-muted/10 text-xs px-2.5 py-1.5 rounded-md font-semibold transition-all self-center text-dg-text-secondary hover:text-dg-text"
              >
                Go to Details
              </Link>
            </div>

            {/* Hover details display */}
            <div className="h-12 flex items-center justify-center text-center px-4 bg-dg-surface-elevated/10 border border-dg-text-muted/10 rounded-xl min-w-[260px] max-w-full truncate">
              {hoveredSong ? (
                <div className="animate-[fadeIn_0.2s_ease-out] w-full text-center">
                  <p className="text-xs text-dg-text-secondary">
                    Compatible: <strong className="text-dg-text">{hoveredSong.title}</strong> by {hoveredSong.artist}
                  </p>
                  <p className="text-[10px] text-dg-text-muted mt-0.5">
                    Key: <span className="text-dg-accent-violet font-semibold">{hoveredSong.musicalKey}</span> • BPM: <span className="text-dg-accent-violet font-semibold">{hoveredSong.bpm}</span>
                  </p>
                </div>
              ) : (
                <p className="text-xs text-dg-text-muted animate-pulse">
                  {loading ? "Re-mapping constellation coordinates..." : "Hover bubbles to inspect metadata. Click to morph space."}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
