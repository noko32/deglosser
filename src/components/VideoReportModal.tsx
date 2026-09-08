"use client";

import { useState } from "react";

interface VideoReportModalProps {
  songMbid: string;
  songTitle: string;
  currentVideoId: string | null;
  onClose: () => void;
  onReportSaved?: () => void;
}

export function VideoReportModal({
  songMbid,
  songTitle,
  currentVideoId,
  onClose,
  onReportSaved,
}: VideoReportModalProps) {
  const [reason, setReason] = useState<"wrong_song" | "correction">("wrong_song");
  const [correctUrl, setCorrectUrl] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/video-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mbid: songMbid,
          videoId: currentVideoId,
          reason,
          correctUrl: reason === "correction" ? correctUrl.trim() : undefined,
          previousVideoId: currentVideoId,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
        onReportSaved?.();
      }
    } catch {
      // Non-fatal
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-dg-surface border border-dg-border-glass rounded-xl p-5 max-w-sm w-[90vw] shadow-2xl">
        {submitted ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-emerald-400">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-dg-text">Report submitted</h3>
            <p className="text-xs text-dg-text-muted mt-1">Thanks for helping improve Melomano.</p>
            <button onClick={onClose} className="mt-4 text-xs text-dg-accent-blue hover:underline">Close</button>
          </div>
        ) : (
          <>
            <h3 className="text-sm font-bold text-dg-text mb-1">Report Incorrect Video</h3>
            <p className="text-[11px] text-dg-text-muted mb-4">
              For &ldquo;{songTitle}&rdquo; — help us fix the wrong video.
            </p>

            <div className="space-y-3 mb-4">
              <label className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${reason === "wrong_song" ? "border-dg-accent-violet/40 bg-dg-accent-violet/5" : "border-dg-border-glass"}`}>
                <input
                  type="radio"
                  name="reason"
                  checked={reason === "wrong_song"}
                  onChange={() => setReason("wrong_song")}
                  className="mt-0.5 accent-dg-accent-violet"
                />
                <div>
                  <span className="text-xs font-semibold text-dg-text">This is the wrong song</span>
                  <p className="text-[10px] text-dg-text-muted">The video playing doesn&apos;t match the track.</p>
                </div>
              </label>

              <label className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${reason === "correction" ? "border-dg-accent-violet/40 bg-dg-accent-violet/5" : "border-dg-border-glass"}`}>
                <input
                  type="radio"
                  name="reason"
                  checked={reason === "correction"}
                  onChange={() => setReason("correction")}
                  className="mt-0.5 accent-dg-accent-violet"
                />
                <div>
                  <span className="text-xs font-semibold text-dg-text">I have the correct URL</span>
                  <p className="text-[10px] text-dg-text-muted">Paste the right YouTube link below.</p>
                </div>
              </label>
            </div>

            {reason === "correction" && (
              <input
                type="url"
                value={correctUrl}
                onChange={(e) => setCorrectUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full mb-4 px-3 py-2 text-xs rounded-lg bg-dg-bg border border-dg-border-glass text-dg-text placeholder:text-dg-text-muted focus:outline-none focus:border-dg-accent-violet/50"
              />
            )}

            <div className="flex items-center gap-2 justify-end">
              <button onClick={onClose} className="px-3 py-1.5 text-xs text-dg-text-secondary hover:text-dg-text transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || (reason === "correction" && !correctUrl.trim())}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-dg-accent-violet/10 text-dg-accent-violet border border-dg-accent-violet/20 hover:bg-dg-accent-violet/20 disabled:opacity-40 transition-colors"
              >
                {submitting ? "Sending…" : "Submit Report"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
