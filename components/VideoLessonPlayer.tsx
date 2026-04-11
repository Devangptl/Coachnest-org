"use client";

/**
 * VideoLessonPlayer — smart video player with watched-segment tracking.
 *
 * Tracking strategy:
 *   • Records [start, end] segments of TIME ACTUALLY PLAYED (not current timestamp).
 *   • Detects and ignores forward scrubbing via inter-poll delta > threshold.
 *   • Merges overlapping segments before computing watched percentage.
 *   • Calls onComplete() exactly once when watched% >= COMPLETE_THRESHOLD (80%).
 *
 * Supports:
 *   • YouTube embed / watch / youtu.be URLs  → YouTube IFrame API
 *   • Direct video files (.mp4 / .webm / .ogg / .mov) → HTML5 <video>
 *   • Any other URL → plain iframe (no tracking, banner shown instead)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { CheckCircle2, Eye, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const COMPLETE_THRESHOLD = 80;   // % of video that must be ACTUALLY watched
const POLL_INTERVAL_MS   = 500;  // How often we poll currentTime (ms)
const SCRUB_THRESHOLD    = 1.8;  // seconds; delta > this = forward scrub

// ─── Segment helpers ──────────────────────────────────────────────────────────

type Segment = readonly [number, number];

function mergeSegments(segs: Segment[]): Segment[] {
  if (!segs.length) return [];
  const sorted = [...segs].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [[sorted[0][0], sorted[0][1]]];
  for (let i = 1; i < sorted.length; i++) {
    const [s, e] = sorted[i];
    const last   = merged[merged.length - 1];
    if (s <= last[1] + 0.3) {
      last[1] = Math.max(last[1], e);
    } else {
      merged.push([s, e]);
    }
  }
  return merged;
}

function calcWatchedPct(segs: Segment[], duration: number): number {
  if (!duration || !segs.length) return 0;
  const total = mergeSegments(segs).reduce((acc, [s, e]) => acc + (e - s), 0);
  return Math.min(100, (total / duration) * 100);
}

// ─── URL detectors ────────────────────────────────────────────────────────────

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.pathname.includes("/embed/")) {
      return u.pathname.split("/embed/")[1]?.split(/[?#]/)[0] || null;
    }
    if (u.hostname.includes("youtube.com") && u.searchParams.has("v")) {
      return u.searchParams.get("v");
    }
    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1).split(/[?#]/)[0] || null;
    }
  } catch {}
  return null;
}

function isVideoFile(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
}

// ─── YouTube IFrame API loader (global singleton) ─────────────────────────────

type YTCallback = () => void;
let ytState: "idle" | "loading" | "ready" = "idle";
const ytQueue: YTCallback[] = [];

function loadYouTubeAPI(cb: YTCallback) {
  if (typeof window === "undefined") return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (ytState === "ready" || (window as any).YT?.Player) { ytState = "ready"; cb(); return; }
  ytQueue.push(cb);
  if (ytState === "loading") return;
  ytState = "loading";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).onYouTubeIframeAPIReady = () => {
    ytState = "ready";
    ytQueue.splice(0).forEach((fn) => fn());
  };
  const s = document.createElement("script");
  s.src = "https://www.youtube.com/iframe_api";
  s.async = true;
  document.head.appendChild(s);
}

// ─── Watch progress bar ───────────────────────────────────────────────────────

function WatchProgressBar({ pct, completed }: { pct: number; completed: boolean }) {
  const pctRound = Math.round(pct);
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-black/70 border-t border-white/5 select-none">
      <Eye className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
      <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pctRound}%`,
            background: completed ? "#22c55e" : pct >= 50 ? "#f97316" : "#f97316bb",
          }}
        />
      </div>
      {completed ? (
        <span className="flex items-center gap-1 text-[11px] font-semibold text-green-400 whitespace-nowrap">
          <CheckCircle2 className="w-3 h-3" /> Watched
        </span>
      ) : (
        <span className="text-[11px] text-white/35 whitespace-nowrap">
          {pctRound}% watched — {COMPLETE_THRESHOLD}% to auto-complete
        </span>
      )}
    </div>
  );
}

// ─── YouTube sub-component ────────────────────────────────────────────────────

interface YTSubProps {
  videoId:    string;
  onPctChange: (pct: number) => void;
}

function YouTubePlayer({ videoId, onPctChange }: YTSubProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef    = useRef<any>(null);
  const segsRef      = useRef<Segment[]>([]);
  const segStartRef  = useRef<number | null>(null);
  const lastTimeRef  = useRef(0);
  const tickRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const durRef       = useRef(0);
  // Keep stable ref so the tick closure doesn't become stale
  const onPctRef     = useRef(onPctChange);
  useEffect(() => { onPctRef.current = onPctChange; });

  const stopTick  = () => { if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; } };
  const startTick = () => {
    stopTick();
    tickRef.current = setInterval(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = playerRef.current as any;
      if (!p?.getCurrentTime) return;
      const t: number = p.getCurrentTime();
      const d: number = p.getDuration();
      if (d > 0) durRef.current = d;

      // ── Forward-scrub detection ───────────────────────────────────────────
      const delta = t - lastTimeRef.current;
      if (delta > SCRUB_THRESHOLD && segStartRef.current !== null) {
        // Time jumped more than expected: close segment at last stable time
        if (lastTimeRef.current > segStartRef.current) {
          segsRef.current.push([segStartRef.current, lastTimeRef.current]);
        }
        segStartRef.current = t;  // New segment starts at scrub destination
      }
      lastTimeRef.current = t;

      const pct = calcWatchedPct(segsRef.current, durRef.current);
      onPctRef.current(pct);
    }, POLL_INTERVAL_MS);
  };

  useEffect(() => {
    if (!containerRef.current) return;
    // Stable div ID for this player instance
    const elId = `yt-${videoId}`;
    const div  = document.createElement("div");
    div.id     = elId;
    div.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
    containerRef.current.appendChild(div);

    loadYouTubeAPI(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const YT = (window as any).YT;
      playerRef.current = new YT.Player(elId, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1, enablejsapi: 1, origin: window.location.origin },
        events: {
          onStateChange: (e: { data: number }) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p    = playerRef.current as any;
            const t: number = p?.getCurrentTime?.() ?? 0;
            const d: number = p?.getDuration?.() ?? 0;
            if (d > 0) durRef.current = d;

            if (e.data === YT.PlayerState.PLAYING) {
              // Begin or resume segment
              if (segStartRef.current === null) {
                segStartRef.current = t;
                lastTimeRef.current = t;
              }
              startTick();
            } else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) {
              stopTick();
              if (segStartRef.current !== null) {
                // Use Math.min(lastTimeRef, t) to guard against seek-then-pause:
                // if the user seeked forward and immediately paused, lastTimeRef still
                // holds the pre-scrub position, which is the correct segment end.
                const segEnd = (lastTimeRef.current > 0 && t - lastTimeRef.current > SCRUB_THRESHOLD)
                  ? lastTimeRef.current
                  : t;
                if (segEnd > segStartRef.current) {
                  segsRef.current.push([segStartRef.current, segEnd]);
                }
                segStartRef.current = null;
              }
              const pct = calcWatchedPct(segsRef.current, durRef.current);
              onPctRef.current(pct);
            }
            // BUFFERING (3) — don't close segment; tick is stopped and will detect
            // any large jump when PLAYING fires again.
          },
        },
      });
    });

    return () => {
      stopTick();
      playerRef.current?.destroy?.();
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full" />;
}

// ─── HTML5 <video> sub-component ─────────────────────────────────────────────

interface HTML5SubProps {
  url:         string;
  onPctChange: (pct: number) => void;
}

function HTML5VideoPlayer({ url, onPctChange }: HTML5SubProps) {
  const segsRef     = useRef<Segment[]>([]);
  const segStartRef = useRef<number | null>(null);
  const prevTimeRef = useRef(0);
  const seekingRef  = useRef(false);
  const onPctRef    = useRef(onPctChange);
  useEffect(() => { onPctRef.current = onPctChange; });

  const finishSegment = (end: number) => {
    if (segStartRef.current !== null && end > segStartRef.current) {
      segsRef.current.push([segStartRef.current, end]);
      segStartRef.current = null;
    }
  };

  return (
    <video
      src={url}
      controls
      preload="metadata"
      className="absolute inset-0 w-full h-full bg-black"
      onPlay={(e) => {
        const v = e.currentTarget;
        segStartRef.current = v.currentTime;
        prevTimeRef.current = v.currentTime;
      }}
      onPause={(e) => {
        finishSegment(e.currentTarget.currentTime);
        onPctRef.current(calcWatchedPct(segsRef.current, e.currentTarget.duration));
      }}
      onEnded={(e) => {
        finishSegment(e.currentTarget.currentTime);
        onPctRef.current(calcWatchedPct(segsRef.current, e.currentTarget.duration));
      }}
      onSeeking={() => {
        // Close segment at last GENUINE play position before seek
        seekingRef.current = true;
        finishSegment(prevTimeRef.current);
      }}
      onSeeked={(e) => {
        const v = e.currentTarget;
        seekingRef.current = false;
        // If playing was happening before the seek, restart segment at new position
        if (!v.paused) segStartRef.current = v.currentTime;
        prevTimeRef.current = v.currentTime;
      }}
      onTimeUpdate={(e) => {
        if (seekingRef.current) return;
        const v = e.currentTarget;
        prevTimeRef.current = v.currentTime;
        onPctRef.current(calcWatchedPct(segsRef.current, v.duration));
      }}
    />
  );
}

// ─── Generic iframe fallback ─────────────────────────────────────────────────

function IframePlayer({ url }: { url: string }) {
  return (
    <iframe
      src={url}
      title="Video Lesson"
      className="absolute inset-0 w-full h-full"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

interface VideoLessonPlayerProps {
  url:              string;
  alreadyCompleted: boolean;
  onComplete:       () => void;
}

export default function VideoLessonPlayer({ url, alreadyCompleted, onComplete }: VideoLessonPlayerProps) {
  const [watchedPct, setWatchedPct] = useState(alreadyCompleted ? COMPLETE_THRESHOLD : 0);
  const [completed,  setCompleted]  = useState(alreadyCompleted);
  const firedRef = useRef(alreadyCompleted);

  const handlePctChange = useCallback((pct: number) => {
    setWatchedPct((prev) => {
      const next = Math.max(prev, pct);
      if (next >= COMPLETE_THRESHOLD && !firedRef.current) {
        firedRef.current = true;
        setCompleted(true);
        // Fire async to avoid state update during render
        setTimeout(onComplete, 0);
      }
      return next;
    });
  }, [onComplete]);

  const youtubeId = getYouTubeId(url);
  const isVidFile = !youtubeId && isVideoFile(url);
  const trackable = !!(youtubeId || isVidFile);

  return (
    <div className="flex flex-col">
      <div className="relative aspect-video bg-black overflow-hidden">
        {youtubeId ? (
          <YouTubePlayer videoId={youtubeId} onPctChange={handlePctChange} />
        ) : isVidFile ? (
          <HTML5VideoPlayer url={url} onPctChange={handlePctChange} />
        ) : (
          <IframePlayer url={url} />
        )}
      </div>

      {trackable && (
        <WatchProgressBar pct={watchedPct} completed={completed} />
      )}

      {!trackable && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-black/40 border-t border-white/5 text-[11px] text-white/30">
          <PlayCircle className="w-3.5 h-3.5" />
          Watch the video, then mark complete manually above.
        </div>
      )}
    </div>
  );
}
