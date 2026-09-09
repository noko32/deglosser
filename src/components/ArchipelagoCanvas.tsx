"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { usePlayer } from "@/context/PlayerContext";
import { GenerativeHarmonicCover } from "./GenerativeHarmonicCover";
import { useArchipelagoData, type ArchipelagoSong } from "@/hooks/useArchipelagoData";
import { useCanvasGestures } from "@/hooks/useCanvasGestures";

interface ArchipelagoCanvasProps {
  initialSong: ArchipelagoSong & { isEstimated: boolean };
  onNodeClick?: (song: ArchipelagoSong) => void;
}

const rad = (deg: number) => (deg * Math.PI) / 180;

const branchConfigs = {
  same: { angle: -45, label: "Perfect Mix", sub: "Same Key", color: "from-emerald-500 to-teal-400" },
  prev: { angle: -135, label: "Energy Down", sub: "Tempo Stagger", color: "from-blue-500 to-indigo-400" },
  next: { angle: 45, label: "Energy Up", sub: "Build Power", color: "from-red-500 to-orange-400" },
  relative: { angle: 135, label: "Mood Shift", sub: "Major/Minor Swap", color: "from-purple-500 to-fuchsia-400" },
  other: { angle: 90, label: "Loose Match", sub: "Adjacent", color: "from-gray-500 to-slate-400" },
};

function getRelationType(recKey: string | null, centerKey: string | null): keyof typeof branchConfigs {
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
}

function getBranchTargetKey(relation: string, centerKey: string | null): string {
  if (!centerKey) return "";
  const cKey = centerKey.toUpperCase().trim();
  const match = cKey.match(/^(\d+)([AB])$/);
  if (!match) return "";
  const num = parseInt(match[1], 10);
  const letter = match[2];
  if (relation === "same") return cKey;
  if (relation === "relative") return `${num}${letter === "A" ? "B" : "A"}`;
  if (relation === "prev") return `${num === 1 ? 12 : num - 1}${letter}`;
  if (relation === "next") return `${num === 12 ? 1 : num + 1}${letter}`;
  return "";
}

export function ArchipelagoCanvas({ initialSong, onNodeClick }: ArchipelagoCanvasProps) {
  const { isPlaying, activeYoutubeId } = usePlayer();
  const isMusicActive = isPlaying || !!activeYoutubeId;

  const containerRef = useRef<HTMLDivElement>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Consolidate states and handlers into custom hooks
  const {
    centerSong,
    recommendations,
    history,
    loading,
    hoveredSong,
    setHoveredSong,
    handleNodeClick,
    handleBackClick,
  } = useArchipelagoData(initialSong, onNodeClick);

  const {
    panOffset,
    zoom,
    isPanning,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleDoubleTap,
    handleTouchStart,
    handleTouchMove,
  } = useCanvasGestures(containerRef);

  const size = 600;
  const center = size / 2;

  // Categorize nodes into branches
  const categorizedNodes: { song: ArchipelagoSong; x: number; y: number; branch: string; color: string }[] = [];
  const branchCounts: Record<string, number> = { same: 0, prev: 0, next: 0, relative: 0, other: 0 };

  // Scale spacing based on total node count
  const totalNodes = recommendations.length;
  const baseRadius = totalNodes <= 5 ? 200 : totalNodes <= 8 ? 185 : 165;
  const radiusStep = totalNodes <= 5 ? 110 : totalNodes <= 8 ? 95 : 85;
  const angleSpread = totalNodes <= 5 ? 22 : totalNodes <= 8 ? 18 : 15;

  recommendations.forEach((song) => {
    const relation = getRelationType(song.musicalKey, centerSong.musicalKey);
    const config = branchConfigs[relation];
    const count = branchCounts[relation]++;
    const staggerAngle = config.angle + (count % 2 === 0 ? 1 : -1) * Math.min(count * angleSpread, 35);
    const radius = baseRadius + Math.floor(count / 2) * radiusStep + (count % 2) * 25;
    const radAngle = rad(staggerAngle);
    categorizedNodes.push({
      song,
      x: center + radius * Math.cos(radAngle),
      y: center + radius * Math.sin(radAngle),
      branch: relation,
      color: config.color,
    });
  });

  const branchHeaders = Object.entries(branchConfigs).map(([key, config]) => {
    const radius = 115;
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

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 flex items-center justify-center overflow-hidden select-none"
      style={{ touchAction: "none", background: "radial-gradient(circle at 50% 50%, #111026 0%, #09090b 80%)" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onClick={handleDoubleTap}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      {/* Radial background glow */}
      <div className="absolute inset-0 bg-radial-glow opacity-20 pointer-events-none" />

      {/* Canvas HUD */}
      <div className="absolute top-12 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          {centerSong.isEstimated && (
            <span className="text-[9px] font-semibold text-dg-accent-amber uppercase tracking-wider bg-dg-accent-amber/10 px-1.5 py-0.5 rounded border border-dg-accent-amber/20 backdrop-blur-sm">
              Estimated
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
          {history.length > 0 && (
            <button
              onClick={handleBackClick}
              disabled={loading}
              className="px-2 py-1 rounded-lg border border-dg-accent-blue/20 bg-dg-accent-blue/10 text-dg-accent-blue hover:bg-dg-accent-blue/20 disabled:opacity-50 transition-all text-[10px] font-bold flex items-center gap-1 backdrop-blur-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
              </svg>
              Back ({history.length})
            </button>
          )}
        </div>
      </div>

      {/* Pannable + zoomable SVG container */}
      <div
        className="relative w-full max-w-[90vw] lg:max-w-[700px] aspect-square"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: "center center",
          transition: isPanning ? "none" : "transform 0.2s ease-out",
        }}
      >
        {/* SVG connectors */}
        <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <circle cx={center} cy={center} r="45" className="fill-none stroke-dg-accent-violet/10 stroke-1 animate-[ping_3s_infinite]" />
          <circle cx={center} cy={center} r="115" className="fill-none stroke-dg-text-muted/5 stroke-[0.5]" strokeDasharray="4 4" />
          <circle cx={center} cy={center} r="210" className="fill-none stroke-dg-text-muted/5 stroke-[0.5]" strokeDasharray="2 4" />

          {branchHeaders.map((header) => {
            const midX = (center + header.x) / 2;
            const midY = (center + header.y) / 2;
            return (
              <path key={header.key} d={`M ${center} ${center} Q ${midX} ${midY} ${header.x} ${header.y}`} className="fill-none stroke-dg-accent-blue/15 stroke-1.5" />
            );
          })}

          {categorizedNodes.map((node, i) => {
            const header = branchHeaders.find((h) => h.key === node.branch);
            if (!header) return null;
            const isHovered = hoveredSong?.mbid === node.song.mbid;
            return (
              <line key={i} x1={header.x} y1={header.y} x2={node.x} y2={node.y}
                className={`transition-all duration-500 ${isHovered ? "stroke-dg-accent-blue/40 stroke-2" : "stroke-dg-text-muted/10 stroke-1"}`}
              />
            );
          })}
        </svg>

        {/* Rendered nodes */}
        <div className="absolute inset-0 w-full h-full z-10 pointer-events-none">
          {/* Center vinyl node */}
          <div
            style={{ left: `${(center / size) * 100}%`, top: `${(center / size) * 100}%` }}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-20 flex flex-col items-center"
          >
            {/* BPM-synced pulse ring */}
            {!loading && centerSong.bpm && (
              <div
                className="absolute pointer-events-none rounded-full border border-dg-accent-blue/30 transition-opacity duration-700"
                style={{
                  width: "7.5rem",
                  height: "7.5rem",
                  left: "50%",
                  top: "calc(50% - 14px)",
                  transform: "translate(-50%, -50%)",
                  animation: `bpm-pulse ${60 / centerSong.bpm}s ease-in-out infinite ${isMusicActive ? "running" : "paused"}`,
                  opacity: isMusicActive ? 1 : 0,
                  transition: "opacity 0.7s ease",
                }}
              />
            )}
            {/* BPM particle emitters */}
            {!loading && centerSong.bpm && Array.from({ length: Math.min(Math.round(centerSong.bpm / 30), 6) }).map((_, i, arr) => {
              const bpm = centerSong.bpm!;
              const angle = (360 / arr.length) * i;
              const beatDuration = 60 / bpm;
              const delay = beatDuration * (i / arr.length);
              const rad = (angle * Math.PI) / 180;
              return (
                <div
                  key={`particle-${i}`}
                  className="absolute w-1.5 h-1.5 rounded-full pointer-events-none transition-opacity duration-700"
                  style={{
                    animation: `bpm-emit-fade ${beatDuration * 2}s ease-out ${delay}s infinite ${isMusicActive ? "running" : "paused"}`,
                    left: `calc(50% + ${Math.cos(rad) * 50}px)`,
                    top: `calc(50% - 14px + ${Math.sin(rad) * 50}px)`,
                    background: `oklch(0.7 0.15 ${angle})`,
                    boxShadow: `0 0 6px oklch(0.7 0.15 ${angle} / 0.5)`,
                    opacity: isMusicActive ? 0.8 : 0,
                    transition: "opacity 0.7s ease",
                  }}
                />
              );
            })}
            <div
              className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-black/90 p-1 border-2 border-dg-accent-blue shadow-[0_0_30px_rgba(59,130,246,0.3)] ${loading ? "animate-pulse" : ""}`}
              style={!loading ? {
                animation: `spin ${Math.max(2, 600 / (centerSong.bpm || 120))}s linear infinite ${isMusicActive ? "running" : "paused"}`,
                transition: "filter 0.7s ease",
                filter: isMusicActive ? "brightness(1)" : "brightness(0.7)",
              } : undefined}
            >
              <div className="absolute inset-0 w-full h-full rounded-full border border-white/5 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black" />
              <div className="absolute inset-2 rounded-full border border-zinc-800/60" />
              <div className="absolute inset-4 rounded-full border border-zinc-800/40" />
              <div className="absolute inset-6 rounded-full border border-zinc-800/20" />
              <div className="absolute inset-[24px] rounded-full overflow-hidden bg-dg-surface border border-zinc-900 flex items-center justify-center">
                {centerSong.coverArtUrl && !failedImages[centerSong.mbid] ? (
                  <Image src={centerSong.coverArtUrl} alt="Album art" fill className="object-cover" unoptimized
                    onError={() => setFailedImages(prev => ({ ...prev, [centerSong.mbid]: true }))} />
                ) : (
                  <GenerativeHarmonicCover title={centerSong.title} artist={centerSong.artist} musicalKey={centerSong.musicalKey} bpm={centerSong.bpm} size="fluid" />
                )}
              </div>
              <div className="absolute inset-[calc(50%-4px)] rounded-full bg-zinc-950 border border-zinc-800 shadow-inner z-10" />
            </div>
            <div className="mt-2 bg-dg-bg/90 border border-dg-accent-blue/30 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold text-dg-accent-blue shadow-md flex items-center gap-1">
              <span>{centerSong.musicalKey}</span>
              <span className="text-dg-text-muted">•</span>
              <span>{centerSong.bpm} BPM</span>
            </div>
          </div>

          {/* Branch headers */}
          {branchHeaders.map((header) => {
            const nodesInBranch = categorizedNodes.filter(n => n.branch === header.key);
            if (nodesInBranch.length === 0) return null;
            return (
              <div key={header.key} style={{ left: `${(header.x / size) * 100}%`, top: `${(header.y / size) * 100}%` }}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-30 text-center flex flex-col items-center">
                <div className={`px-2 py-1 rounded bg-gradient-to-r ${header.color} text-[9px] font-bold text-black uppercase tracking-wider shadow-md hover:scale-105 transition-all`}>
                  {header.label}
                </div>
                <span className="text-[8px] text-dg-text-muted mt-0.5 block font-semibold tracking-wide">{header.sub}</span>
              </div>
            );
          })}

          {/* Floating song bubbles */}
          {categorizedNodes.map((node, i) => {
            const isHovered = hoveredSong?.mbid === node.song.mbid;
            return (
              <div key={i} style={{ left: `${(node.x / size) * 100}%`, top: `${(node.y / size) * 100}%` }}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-20 group">
                <button
                  onClick={(e) => { e.stopPropagation(); handleNodeClick(node.song); }}
                  onMouseEnter={() => setHoveredSong(node.song)}
                  onMouseLeave={() => setHoveredSong(null)}
                  className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border bg-dg-surface p-0.5 transition-all duration-500 ease-out hover:scale-110 hover:z-40 active:scale-95 shadow-md flex items-center justify-center ${isHovered ? "border-dg-accent-blue shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-105" : "border-dg-text-muted/20"
                    }`}
                >
                  <div className="relative w-full h-full rounded-full overflow-hidden bg-dg-surface-elevated">
                    {node.song.coverArtUrl && !failedImages[node.song.mbid] ? (
                      <Image src={node.song.coverArtUrl} alt={node.song.title} fill
                        className="object-cover group-hover:rotate-[30deg] transition-transform duration-700" unoptimized
                        onError={() => setFailedImages(prev => ({ ...prev, [node.song.mbid]: true }))} />
                    ) : (
                      <GenerativeHarmonicCover title={node.song.title} artist={node.song.artist} musicalKey={node.song.musicalKey} bpm={node.song.bpm} size="fluid" />
                    )}
                  </div>
                  <span className="absolute -bottom-1 -right-1 bg-black border border-white/10 px-1 rounded-full text-[7px] font-mono text-dg-text font-bold">
                    {node.song.musicalKey}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Zoom badge */}
      {zoom !== 1 && (
        <div className="absolute bottom-20 lg:bottom-4 right-4 z-20 bg-dg-bg/80 border border-dg-border-glass px-2 py-1 rounded-full text-[10px] font-mono text-dg-accent-blue font-bold">
          {zoom.toFixed(1)}×
        </div>
      )}

      {/* Desktop hover details */}
      <div className="absolute bottom-4 left-4 right-[440px] z-20 hidden lg:flex h-12 items-center justify-center px-4 bg-dg-surface-elevated/10 border border-dg-text-muted/10 rounded-xl truncate">
        {hoveredSong ? (
          <div className="text-center w-full">
            <p className="text-xs text-dg-text-secondary">
              Compatible: <strong className="text-dg-text">{hoveredSong.title}</strong> by {hoveredSong.artist}
            </p>
            <p className="text-[10px] text-dg-text-muted mt-0.5">
              Key: <span className="text-dg-accent-violet font-semibold">{hoveredSong.musicalKey}</span> • BPM: <span className="text-dg-accent-violet font-semibold">{hoveredSong.bpm}</span>
            </p>
          </div>
        ) : (
          <p className="text-xs text-dg-text-muted animate-pulse">
            {loading ? "Re-mapping constellation coordinates..." : "Hover bubbles to inspect. Click to traverse."}
          </p>
        )}
      </div>
    </div>
  );
}
