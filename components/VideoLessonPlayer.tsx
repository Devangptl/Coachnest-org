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
 *   • Any other URL → plain iframe (manual-complete button shown)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { CheckCircle2, PlayCircle, Loader2 } from "lucide-react";
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

interface WatchProgressBarProps {
  pct:       number;
  completed: boolean;
}

function WatchProgressBar({ pct, completed }: WatchProgressBarProps) {
  // Always show 100% fill width when completed, regardless of tracked pct
  const fillWidth = completed ? 100 : Math.round(pct);

  return (
    <div className="px-4 py-3 bg-card border-t border-border flex flex-col gap-2">
      {/* Bar + label row */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-out",
              completed ? "bg-emerald-500" : pct >= COMPLETE_THRESHOLD ? "bg-emerald-500" : "bg-[#d97757]"
            )}
            style={{ width: `${fillWidth}%` }}
          />
        </div>

        {completed ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 whitespace-nowrap flex-shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Lesson Complete
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground/50 whitespace-nowrap flex-shrink-0 tabular-nums">
            {Math.round(pct)}%
          </span>
        )}
      </div>

      {/* Hint row */}
      {!completed && (
        <p className="text-[11px] text-muted-foreground/40 leading-snug">
          Watch at least <span className="font-semibold text-[#d97757]/70">{COMPLETE_THRESHOLD}%</span> of the video to auto-complete this lesson.
        </p>
      )}
    </div>
  );
}

// ─── Completion overlay (brief flash on screen when newly completed) ───────────

function CompletionOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
      <div className="flex items-center gap-2 bg-emerald-500/90 text-white font-semibold text-sm px-5 py-3 rounded-full shadow-lg shadow-emerald-500/30 animate-in fade-in zoom-in-95 duration-300">
        <CheckCircle2 className="w-4 h-4" />
        Lesson Complete!
      </div>
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

      const delta = t - lastTimeRef.current;
      if (delta > SCRUB_THRESHOLD && segStartRef.current !== null) {
        if (lastTimeRef.current > segStartRef.current) {
          segsRef.current.push([segStartRef.current, lastTimeRef.current]);
        }
        segStartRef.current = t;
      }
      lastTimeRef.current = t;

      const pct = calcWatchedPct(segsRef.current, durRef.current);
      onPctRef.current(pct);
    }, POLL_INTERVAL_MS);
  };

  useEffect(() => {
    if (!containerRef.current) return;
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
              if (segStartRef.current === null) {
                segStartRef.current = t;
                lastTimeRef.current = t;
              }
              startTick();
            } else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) {
              stopTick();
              if (segStartRef.current !== null) {
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
        seekingRef.current = true;
        finishSegment(prevTimeRef.current);
      }}
      onSeeked={(e) => {
        const v = e.currentTarget;
        seekingRef.current = false;
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

interface IframePlayerProps {
  url:               string;
  alreadyCompleted:  boolean;
  onManualComplete?: () => void;
  markingComplete:   boolean;
}

function IframePlayer({ url, alreadyCompleted, onManualComplete, markingComplete }: IframePlayerProps) {
  return (
    <>
      <iframe
        src={url}
        title="Video Lesson"
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
      {/* Manual-complete overlay button pinned to bottom-right of video */}
      {onManualComplete && (
        <div className="absolute bottom-3 right-3 z-10">
          {alreadyCompleted ? (
            <div className="flex items-center gap-1.5 bg-emerald-500/90 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Completed
            </div>
          ) : (
            <button
              onClick={onManualComplete}
              disabled={markingComplete}
              className="flex items-center gap-1.5 bg-[#d97757] hover:bg-orange-500 disabled:opacity-60 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg transition-colors"
            >
              {markingComplete ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              {markingComplete ? "Saving…" : "Mark Complete"}
            </button>
          )}
        </div>
      )}
    </>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

interface VideoLessonPlayerProps {
  url:               string;
  alreadyCompleted:  boolean;
  onComplete:        () => void;
  /** Shown only for non-trackable (iframe) videos; uses same handler */
  onManualComplete?: () => void;
}

export default function VideoLessonPlayer({
  url,
  alreadyCompleted,
  onComplete,
  onManualComplete,
}: VideoLessonPlayerProps) {
  // Bug fix: use 100 (not COMPLETE_THRESHOLD) so the bar fills to 100% when already done
  const [watchedPct,      setWatchedPct]      = useState(alreadyCompleted ? 100 : 0);
  const [completed,       setCompleted]       = useState(alreadyCompleted);
  const [showOverlay,     setShowOverlay]     = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);
  const firedRef = useRef(alreadyCompleted);

  const handlePctChange = useCallback((pct: number) => {
    setWatchedPct((prev) => {
      const next = Math.max(prev, pct);
      if (next >= COMPLETE_THRESHOLD && !firedRef.current) {
        firedRef.current = true;
        setCompleted(true);
        // Brief completion overlay
        setShowOverlay(true);
        setTimeout(() => setShowOverlay(false), 2500);
        // Fire async to avoid state update during render
        setTimeout(onComplete, 0);
      }
      return next;
    });
  }, [onComplete]);

  const handleManualComplete = useCallback(async () => {
    if (markingComplete || completed) return;
    setMarkingComplete(true);
    try {
      onManualComplete?.();
      // Small delay so the parent can process; then reflect locally
      await new Promise((r) => setTimeout(r, 400));
      setCompleted(true);
      setShowOverlay(true);
      setTimeout(() => setShowOverlay(false), 2500);
    } finally {
      setMarkingComplete(false);
    }
  }, [markingComplete, completed, onManualComplete]);

  const youtubeId = getYouTubeId(url);
  const isVidFile = !youtubeId && isVideoFile(url);
  const trackable = !!(youtubeId || isVidFile);

  return (
    <div className="flex flex-col">
      {/* ── Video area ──────────────────────────────────────────────────── */}
      <div className="relative aspect-video bg-black overflow-hidden">
        {youtubeId ? (
          <YouTubePlayer videoId={youtubeId} onPctChange={handlePctChange} />
        ) : isVidFile ? (
          <HTML5VideoPlayer url={url} onPctChange={handlePctChange} />
        ) : (
          <IframePlayer
            url={url}
            alreadyCompleted={completed}
            onManualComplete={onManualComplete ? handleManualComplete : undefined}
            markingComplete={markingComplete}
          />
        )}

        {/* Completion flash overlay */}
        <CompletionOverlay show={showOverlay} />

        {/* "Already completed" badge — shown when opening a done lesson */}
        {alreadyCompleted && !showOverlay && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-emerald-500/80 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </div>
        )}
      </div>

      {/* ── Progress bar (trackable videos only) ────────────────────────── */}
      {trackable && (
        <WatchProgressBar pct={watchedPct} completed={completed} />
      )}

      {/* ── Non-trackable hint (no manual button here; button is in the iframe overlay) ── */}
      {!trackable && !onManualComplete && (
        <div className="flex items-center gap-2 px-4 py-3 bg-card border-t border-border text-[11px] text-muted-foreground/50">
          <PlayCircle className="w-3.5 h-3.5 flex-shrink-0" />
          Watch the video, then mark it complete using the button on the video.
        </div>
      )}
    </div>
  );
}
