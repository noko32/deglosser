"use client";

import { usePlayer } from "@/context/PlayerContext";

function getYouTubeId(uri: string): string | null {
  try {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = uri.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  } catch {
    return null;
  }
}

export function GlobalYouTubeDrawer() {
  const {
    activeYoutubeId,
    youtubeTitle,
    isYoutubeOpen,
    youtubeAlternativeVideos,
    playYoutube,
    closeYoutube,
    setYoutubeOpen,
  } = usePlayer();

  if (!activeYoutubeId) return null;

  const watchUrl = `https://www.youtube.com/watch?v=${activeYoutubeId}`;
  const alternatives = (() => {
    const seen = new Set<string>();
    const result: { video: (typeof youtubeAlternativeVideos)[number]; id: string }[] = [];
    for (const video of youtubeAlternativeVideos) {
      const id = getYouTubeId(video.uri);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      result.push({ video, id });
    }
    return result;
  })();

  return (
    <>
      {!isYoutubeOpen && (
        <button
          onClick={() => setYoutubeOpen(true)}
          className="fixed right-0 top-[40%] transform -translate-y-1/2 z-40 bg-red-600 hover:bg-red-700 hover:scale-105 active:scale-95 text-white pl-4 pr-3 py-3 rounded-l-full shadow-2xl transition-all duration-300 flex items-center gap-2 border-l border-t border-b border-red-500/20 group"
          title={`Expand player: ${youtubeTitle || "Video"}`}
        >
          <div className="flex items-end gap-0.5 h-3.5 w-3.5">
            <span className="w-0.5 h-1 bg-white rounded-full animate-[soundWave_1.2s_ease-in-out_infinite_stagger]" style={{ animationDelay: "0s" }} />
            <span className="w-0.5 h-3 bg-white rounded-full animate-[soundWave_1.2s_ease-in-out_infinite_stagger]" style={{ animationDelay: "0.2s" }} />
            <span className="w-0.5 h-2 bg-white rounded-full animate-[soundWave_1.2s_ease-in-out_infinite_stagger]" style={{ animationDelay: "0.4s" }} />
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 animate-pulse group-hover:scale-110 transition-transform">
            <path d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" />
          </svg>
        </button>
      )}

      <div
        className={`fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[380px] bg-dg-bg/95 border-l border-dg-text-muted/10 shadow-2xl backdrop-blur-xl transition-all duration-500 ease-out flex flex-col ${
          isYoutubeOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes soundWave {
            0%, 100% { height: 4px; }
            50% { height: 14px; }
          }
        `}} />

        <div className="p-4 border-b border-dg-text-muted/10 flex items-center justify-between bg-dg-surface-elevated/20">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="flex h-2.5 w-2.5 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-600 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
            </span>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-red-500 font-mono">Stream Active</span>
              <h3 className="text-xs font-bold text-dg-text truncate block leading-tight" title={youtubeTitle || "YouTube Video"}>
                {youtubeTitle || "Sourced Stream"}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <button
              onClick={() => setYoutubeOpen(false)}
              className="p-1.5 rounded-lg border border-dg-text-muted/10 text-dg-text-secondary hover:text-dg-text hover:bg-dg-surface-elevated/30 hover:scale-105 active:scale-95 transition-all"
              title="Minimize to Floating Pill"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
            <button
              onClick={() => closeYoutube()}
              className="p-1.5 rounded-lg border border-red-500/10 text-red-400 hover:text-red-500 hover:bg-red-500/5 hover:scale-105 active:scale-95 transition-all"
              title="Terminate Stream"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="relative w-full aspect-video bg-black flex items-center justify-center border-b border-dg-text-muted/10">
          <iframe
            src={`https://www.youtube.com/embed/${activeYoutubeId}?autoplay=1&enablejsapi=1`}
            title={youtubeTitle || "YouTube video player"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-0"
          />
        </div>

        <div className="p-4 border-b border-dg-text-muted/10 space-y-3">
          <p className="text-[11px] text-dg-text-muted leading-relaxed">
            Age-restricted videos often fail inside embeds. If playback is blocked, open it on YouTube or try an alternative stream below.
          </p>
          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            Open on YouTube
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          {alternatives.length > 1 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-dg-text-muted">Try another stream</p>
              {alternatives.map((item) => {
                const isActive = item.id === activeYoutubeId;
                return (
                  <button
                    key={item.id}
                    onClick={() => playYoutube(item.id, item.video.title, youtubeAlternativeVideos)}
                    className={`w-full text-left p-2 rounded text-xs border transition-all ${
                      isActive
                        ? "bg-red-500/10 border-red-500/30 text-red-400 font-semibold"
                        : "bg-dg-surface-elevated/20 border-transparent text-dg-text-secondary hover:bg-dg-surface-elevated/40"
                    }`}
                  >
                    <span className="line-clamp-2">{item.video.title}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex flex-col gap-3 text-center justify-center items-center text-dg-text-muted">
              <p className="text-xs max-w-[240px] leading-relaxed">
                Stream stays docked while you browse the constellation.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
