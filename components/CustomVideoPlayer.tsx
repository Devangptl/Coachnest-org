"use client";

/**
 * CustomVideoPlayer — premium HTML5 video player with a YouTube-style UI.
 *
 * Replaces the default browser controls with a fully custom interface:
 *   • Play / Pause, ±10s skip, mute, volume slider
 *   • Draggable seek bar with buffered indicator + thumbnail/time preview
 *   • Playback speed (0.5×–2×) and quality selector
 *   • Picture-in-picture, fullscreen, double-click fullscreen
 *   • Keyboard shortcuts (Space, ←/→, ↑/↓, F, M)
 *   • Mobile touch gestures (single tap toggle play; double-tap to seek)
 *   • Auto-hide controls while playing; loading spinner; big center play
 *
 * Tracking-friendly: all native <video> events are forwarded via callbacks so
 * parents (e.g. VideoLessonPlayer) can keep their watched-segment logic.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type SyntheticEvent,
} from "react";

/* ─── Types ──────────────────────────────────────────────────────────────── */

export interface QualitySource {
  /** Display label, e.g. "1080p", "720p", "Auto" */
  label: string;
  /** Video file URL for this quality */
  src: string;
}

export interface CustomVideoPlayerProps {
  /** Primary video URL. If `qualities` is provided this is overridden by the active quality. */
  src: string;
  poster?: string;
  className?: string;
  /** Optional list of selectable quality variants */
  qualities?: QualitySource[];
  /** Fired once metadata is loaded (gives access to duration). */
  onLoadedMetadata?: (e: SyntheticEvent<HTMLVideoElement>) => void;
  onPlay?: (e: SyntheticEvent<HTMLVideoElement>) => void;
  onPause?: (e: SyntheticEvent<HTMLVideoElement>) => void;
  onEnded?: (e: SyntheticEvent<HTMLVideoElement>) => void;
  onSeeking?: (e: SyntheticEvent<HTMLVideoElement>) => void;
  onSeeked?: (e: SyntheticEvent<HTMLVideoElement>) => void;
  onTimeUpdate?: (e: SyntheticEvent<HTMLVideoElement>) => void;
}

/* ─── Inline SVG icon set (so we don't drag in another icon library) ─────── */

const Icon = {
  Play: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13a1 1 0 0 0 1.55.83l10-6.5a1 1 0 0 0 0-1.66l-10-6.5A1 1 0 0 0 8 5.5z" />
    </svg>
  ),
  Pause: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="currentColor" aria-hidden="true">
      <rect x="6.5" y="5" width="4" height="14" rx="1.2" />
      <rect x="13.5" y="5" width="4" height="14" rx="1.2" />
    </svg>
  ),
  Replay: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  ),
  Back10: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <polyline points="3 3 3 8 8 8" />
      <text x="12" y="16" fontSize="7" fontWeight="700" fill="currentColor" stroke="none" textAnchor="middle">10</text>
    </svg>
  ),
  Fwd10: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <polyline points="21 3 21 8 16 8" />
      <text x="12" y="16" fontSize="7" fontWeight="700" fill="currentColor" stroke="none" textAnchor="middle">10</text>
    </svg>
  ),
  VolumeHigh: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="currentColor" aria-hidden="true">
      <path d="M3 10v4a1 1 0 0 0 1 1h3l4.3 3.6a1 1 0 0 0 1.7-.77V6.17a1 1 0 0 0-1.7-.77L7 9H4a1 1 0 0 0-1 1z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M19 6a8 8 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  VolumeLow: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="currentColor" aria-hidden="true">
      <path d="M3 10v4a1 1 0 0 0 1 1h3l4.3 3.6a1 1 0 0 0 1.7-.77V6.17a1 1 0 0 0-1.7-.77L7 9H4a1 1 0 0 0-1 1z" />
      <path d="M16.5 9.5a4 4 0 0 1 0 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  VolumeMute: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="currentColor" aria-hidden="true">
      <path d="M3 10v4a1 1 0 0 0 1 1h3l4.3 3.6a1 1 0 0 0 1.7-.77V6.17a1 1 0 0 0-1.7-.77L7 9H4a1 1 0 0 0-1 1z" />
      <path d="M16 9l5 5m0-5l-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  Settings: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06A2 2 0 1 1 4.24 16.97l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06A2 2 0 1 1 7.03 4.24l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.31.74.97 1.22 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  ),
  Pip: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.2" />
      <rect x="12.5" y="11.5" width="7" height="6" rx="1.2" fill="currentColor" stroke="none" />
    </svg>
  ),
  FullscreenEnter: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  ),
  FullscreenExit: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
    </svg>
  ),
  Check: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="5 12 10 17 19 7" />
    </svg>
  ),
  Chevron: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 6 15 12 9 18" />
    </svg>
  ),
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function CustomVideoPlayer({
  src,
  poster,
  className,
  qualities,
  onLoadedMetadata,
  onPlay,
  onPause,
  onEnded,
  onSeeking,
  onSeeked,
  onTimeUpdate,
}: CustomVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* State */
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ended, setEnded] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsPane, setSettingsPane] = useState<"root" | "speed" | "quality">("root");
  const [playbackRate, setPlaybackRate] = useState(1);

  const [activeQualityIdx, setActiveQualityIdx] = useState(0);
  const activeQuality = qualities?.[activeQualityIdx];
  const effectiveSrc = activeQuality?.src ?? src;

  /* Hover preview */
  const [hover, setHover] = useState<{ x: number; time: number } | null>(null);
  const [previewReady, setPreviewReady] = useState(false);

  /* Drag-seek */
  const [dragging, setDragging] = useState(false);

  /* Skip indicators (animated +10/-10 bursts) */
  const [skipIndicator, setSkipIndicator] = useState<"forward" | "backward" | null>(null);
  const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Native video event handlers (also forward to parent) ── */

  const handleLoadedMetadata = (e: SyntheticEvent<HTMLVideoElement>) => {
    const d = e.currentTarget.duration;
    if (Number.isFinite(d)) setDuration(d);
    setLoading(false);
    onLoadedMetadata?.(e);
  };

  const handlePlay = (e: SyntheticEvent<HTMLVideoElement>) => {
    setIsPlaying(true);
    setEnded(false);
    setHasStarted(true);
    onPlay?.(e);
  };

  const handlePause = (e: SyntheticEvent<HTMLVideoElement>) => {
    setIsPlaying(false);
    onPause?.(e);
  };

  const handleEnded = (e: SyntheticEvent<HTMLVideoElement>) => {
    setIsPlaying(false);
    setEnded(true);
    setControlsVisible(true);
    onEnded?.(e);
  };

  const handleTimeUpdate = (e: SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    if (!dragging) setCurrentTime(v.currentTime);
    /* Buffered tail */
    try {
      const b = v.buffered;
      if (b.length > 0) setBuffered(b.end(b.length - 1));
    } catch {}
    onTimeUpdate?.(e);
  };

  const handleSeeking = (e: SyntheticEvent<HTMLVideoElement>) => {
    setLoading(true);
    onSeeking?.(e);
  };

  const handleSeeked = (e: SyntheticEvent<HTMLVideoElement>) => {
    setLoading(false);
    onSeeked?.(e);
  };

  /* ── Control actions ── */

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused || v.ended) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, []);

  const seekBy = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    const next = Math.max(0, Math.min((v.duration || 0), v.currentTime + delta));
    v.currentTime = next;
    setCurrentTime(next);
    setSkipIndicator(delta > 0 ? "forward" : "backward");
    if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
    skipTimerRef.current = setTimeout(() => setSkipIndicator(null), 550);
  }, []);

  const seekTo = useCallback((time: number) => {
    const v = videoRef.current;
    if (!v) return;
    const next = Math.max(0, Math.min((v.duration || 0), time));
    v.currentTime = next;
    setCurrentTime(next);
  }, []);

  const setVolumeValue = useCallback((val: number) => {
    const v = videoRef.current;
    if (!v) return;
    const clamped = Math.max(0, Math.min(1, val));
    v.volume = clamped;
    setVolume(clamped);
    if (clamped === 0) {
      v.muted = true;
      setMuted(true);
    } else if (v.muted) {
      v.muted = false;
      setMuted(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted && v.volume === 0) {
      v.volume = 0.5;
      setVolume(0.5);
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch {}
  }, []);

  const togglePip = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if ("requestPictureInPicture" in v) {
        await (v as HTMLVideoElement).requestPictureInPicture();
      }
    } catch {}
  }, []);

  const setRate = (rate: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const setQuality = (idx: number) => {
    if (!qualities || idx === activeQualityIdx) return;
    const v = videoRef.current;
    const resumeTime = v?.currentTime ?? 0;
    const wasPlaying = v ? !v.paused : false;
    setActiveQualityIdx(idx);
    /* When the new src loads, restore time/play state */
    requestAnimationFrame(() => {
      const nv = videoRef.current;
      if (!nv) return;
      const onMeta = () => {
        nv.currentTime = resumeTime;
        if (wasPlaying) nv.play().catch(() => {});
        nv.removeEventListener("loadedmetadata", onMeta);
      };
      nv.addEventListener("loadedmetadata", onMeta);
    });
  };

  /* ── Auto-hide controls ── */

  const bumpControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (isPlaying && !showSettings && !dragging) {
      hideTimerRef.current = setTimeout(() => setControlsVisible(false), 2800);
    }
  }, [isPlaying, showSettings, dragging]);

  useEffect(() => {
    bumpControls();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [bumpControls]);

  /* ── Fullscreen / PiP listeners ── */

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onEnter = () => setIsPip(true);
    const onLeave = () => setIsPip(false);
    v.addEventListener("enterpictureinpicture", onEnter);
    v.addEventListener("leavepictureinpicture", onLeave);
    return () => {
      v.removeEventListener("enterpictureinpicture", onEnter);
      v.removeEventListener("leavepictureinpicture", onLeave);
    };
  }, []);

  /* ── Keyboard shortcuts (active when player is focused/hovered) ── */

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onKey = (e: KeyboardEvent) => {
      /* Don't intercept typing */
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;

      switch (e.key) {
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          togglePlay();
          bumpControls();
          break;
        case "ArrowRight":
          e.preventDefault();
          seekBy(10);
          bumpControls();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekBy(-10);
          bumpControls();
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolumeValue(volume + 0.05);
          bumpControls();
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolumeValue(volume - 0.05);
          bumpControls();
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          bumpControls();
          break;
      }
    };

    /* Use focus-aware activation: only intercept if pointer is inside or
     * the container is focused. We hook on the container with capture. */
    const handler = (e: Event) => onKey(e as KeyboardEvent);
    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, [togglePlay, seekBy, setVolumeValue, toggleFullscreen, toggleMute, volume, bumpControls]);

  /* ── Progress bar interactions ── */

  const positionToTime = (clientX: number): number => {
    const bar = progressRef.current;
    if (!bar || !duration) return 0;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pct * duration;
  };

  const onProgressPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!duration) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    const t = positionToTime(e.clientX);
    seekTo(t);
  };
  const onProgressPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!duration) return;
    const t = positionToTime(e.clientX);
    setHover({ x: e.clientX - (progressRef.current?.getBoundingClientRect().left ?? 0), time: t });
    if (dragging) seekTo(t);
    /* Update hidden preview-video time (lazy seek) */
    const pv = previewVideoRef.current;
    if (pv && Math.abs((pv.currentTime || 0) - t) > 0.4) {
      try { pv.currentTime = t; } catch {}
    }
  };
  const onProgressPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
      setDragging(false);
    }
  };
  const onProgressPointerLeave = () => setHover(null);

  /* ── Volume drag ── */
  const volumeRef = useRef<HTMLDivElement>(null);
  const onVolumePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setVolumeFromPointer(e.clientX);
    const move = (ev: PointerEvent) => setVolumeFromPointer(ev.clientX);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const setVolumeFromPointer = (clientX: number) => {
    const bar = volumeRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setVolumeValue(pct);
  };

  /* ── Touch gestures: single-tap toggles, double-tap seeks ── */
  const lastTapRef = useRef<{ t: number; x: number; side: "left" | "right" | null }>({ t: 0, x: 0, side: null });
  const onSurfaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    /* Detect double-click for fullscreen on desktop */
    if (e.detail === 2) {
      toggleFullscreen();
      return;
    }
    /* Single click toggles play */
    togglePlay();
    bumpControls();
  };
  const onSurfaceTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const now = Date.now();
    const touch = e.changedTouches[0];
    if (!touch || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const side: "left" | "right" = touch.clientX - rect.left < rect.width / 2 ? "left" : "right";
    const prev = lastTapRef.current;
    if (prev.t && now - prev.t < 320 && side === prev.side) {
      /* Double-tap */
      seekBy(side === "right" ? 10 : -10);
      lastTapRef.current = { t: 0, x: 0, side: null };
    } else {
      lastTapRef.current = { t: now, x: touch.clientX, side };
    }
  };

  /* ── Computed values ── */

  const playedPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? Math.min(100, (buffered / duration) * 100) : 0;
  const volumePct = (muted ? 0 : volume) * 100;

  const volumeIcon = useMemo(() => {
    if (muted || volume === 0) return Icon.VolumeMute;
    if (volume < 0.5) return Icon.VolumeLow;
    return Icon.VolumeHigh;
  }, [muted, volume]);

  /* ── Render ── */

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={[
        "group/player relative w-full h-full overflow-hidden bg-black text-white",
        "rounded-xl select-none outline-none",
        "focus-visible:ring-2 focus-visible:ring-white/30",
        className ?? "",
      ].join(" ")}
      onMouseMove={bumpControls}
      onMouseLeave={() => {
        if (isPlaying && !showSettings) setControlsVisible(false);
      }}
      style={{ cursor: controlsVisible || !isPlaying ? "default" : "none" }}
      aria-label="Video player"
    >
      {/* ── Native video element (no default controls) ─────────────────────── */}
      <video
        ref={videoRef}
        src={effectiveSrc}
        poster={poster}
        preload="metadata"
        playsInline
        className="absolute inset-0 w-full h-full object-contain bg-black"
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onTimeUpdate={handleTimeUpdate}
        onSeeking={handleSeeking}
        onSeeked={handleSeeked}
        onWaiting={() => setLoading(true)}
        onPlaying={() => setLoading(false)}
        onCanPlay={() => setLoading(false)}
        onVolumeChange={(e) => {
          setVolume(e.currentTarget.volume);
          setMuted(e.currentTarget.muted);
        }}
      />

      {/* ── Hidden secondary <video> used to render hover thumbnails ──────── */}
      <video
        ref={previewVideoRef}
        src={effectiveSrc}
        muted
        preload="metadata"
        className="hidden"
        onLoadedData={() => setPreviewReady(true)}
      />

      {/* ── Click/tap surface (gestures) — sits below controls layer ─────── */}
      <div
        className="absolute inset-0 z-10"
        onClick={onSurfaceClick}
        onTouchEnd={onSurfaceTouchEnd}
        aria-hidden="true"
      />

      {/* ── Top + bottom gradient overlays (cinematic) ────────────────────── */}
      <div
        className={[
          "pointer-events-none absolute inset-0 z-20 transition-opacity duration-300",
          controlsVisible || !isPlaying ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 via-black/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      </div>

      {/* ── Loading spinner ────────────────────────────────────────────────── */}
      {loading && (
        <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-2 border-white/15" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white animate-spin" />
          </div>
        </div>
      )}

      {/* ── Skip indicators (±10s pulse) ───────────────────────────────────── */}
      {skipIndicator && (
        <div
          className={[
            "pointer-events-none absolute top-1/2 -translate-y-1/2 z-30",
            "flex items-center gap-1.5 px-3 py-2 rounded-full",
            "bg-black/55 backdrop-blur-md text-white text-xs font-semibold",
            "animate-[skipPulse_550ms_ease-out]",
            skipIndicator === "forward" ? "right-[18%]" : "left-[18%]",
          ].join(" ")}
        >
          {skipIndicator === "forward" ? <Icon.Fwd10 className="w-4 h-4" /> : <Icon.Back10 className="w-4 h-4" />}
          10s
        </div>
      )}

      {/* ── Big center play button (when paused, not yet started, or ended) ── */}
      {(!isPlaying || ended || !hasStarted) && !loading && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
            bumpControls();
          }}
          aria-label={ended ? "Replay" : "Play"}
          className={[
            "absolute z-30 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            "grid place-items-center h-16 w-16 md:h-20 md:w-20 rounded-full",
            "bg-white/12 backdrop-blur-md border border-white/20",
            "shadow-[0_12px_40px_rgba(0,0,0,0.5)]",
            "transition-all duration-200 hover:bg-white/20 hover:scale-105 active:scale-95",
          ].join(" ")}
        >
          {ended ? (
            <Icon.Replay className="w-7 h-7 md:w-8 md:h-8 text-white" />
          ) : (
            <Icon.Play className="w-8 h-8 md:w-10 md:h-10 text-white translate-x-[2px]" />
          )}
        </button>
      )}

      {/* ── Control bar ───────────────────────────────────────────────────── */}
      <div
        className={[
          "absolute inset-x-0 bottom-0 z-40 px-2 sm:px-4 pb-2 sm:pb-3 pt-1",
          "transition-all duration-300",
          controlsVisible || !isPlaying ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress + hover preview */}
        <div
          className="relative w-full"
          onPointerEnter={() => setHover({ x: 0, time: 0 })}
          onPointerLeave={onProgressPointerLeave}
        >
          {/* Hover preview popover */}
          {hover && duration > 0 && (
            <div
              className="pointer-events-none absolute -top-2 -translate-y-full"
              style={{
                left: Math.max(60, Math.min(hover.x, (progressRef.current?.clientWidth ?? 0) - 60)),
                transform: "translateX(-50%) translateY(-100%)",
              }}
            >
              <div className="flex flex-col items-center gap-1">
                <div
                  className="relative overflow-hidden rounded-md border border-white/15 shadow-[0_8px_24px_rgba(0,0,0,0.6)] bg-black"
                  style={{ width: 158, height: 90 }}
                >
                  {previewReady && (
                    <video
                      key="preview-clone"
                      src={effectiveSrc}
                      muted
                      preload="metadata"
                      className="absolute inset-0 w-full h-full object-cover"
                      style={
                        {
                          /* Sync via the inline ref approach below */
                        } as CSSProperties
                      }
                      ref={(el) => {
                        if (el && Math.abs((el.currentTime || 0) - hover.time) > 0.3) {
                          try { el.currentTime = hover.time; } catch {}
                        }
                      }}
                    />
                  )}
                  {!previewReady && (
                    <div className="absolute inset-0 grid place-items-center text-white/40 text-[10px]">
                      Preview
                    </div>
                  )}
                </div>
                <span className="text-[11px] font-medium tabular-nums px-1.5 py-0.5 rounded bg-black/70 text-white">
                  {formatTime(hover.time)}
                </span>
              </div>
            </div>
          )}

          {/* Progress bar */}
          <div
            ref={progressRef}
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.floor(duration)}
            aria-valuenow={Math.floor(currentTime)}
            tabIndex={0}
            onPointerDown={onProgressPointerDown}
            onPointerMove={onProgressPointerMove}
            onPointerUp={onProgressPointerUp}
            className={[
              "group/seek relative w-full cursor-pointer",
              "py-2.5 -mb-1",
            ].join(" ")}
          >
            <div
              className={[
                "relative w-full bg-white/20 rounded-full overflow-visible",
                "transition-[height] duration-150",
                dragging ? "h-1.5" : "h-1 group-hover/seek:h-1.5",
              ].join(" ")}
            >
              {/* Buffered */}
              <div
                className="absolute inset-y-0 left-0 bg-white/35 rounded-full transition-[width] duration-200"
                style={{ width: `${bufferedPct}%` }}
              />
              {/* Played */}
              <div
                className="absolute inset-y-0 left-0 bg-[#ff3b3b] rounded-full shadow-[0_0_8px_rgba(255,59,59,0.5)]"
                style={{ width: `${playedPct}%` }}
              />
              {/* Thumb */}
              <div
                className={[
                  "absolute top-1/2 -translate-y-1/2 -translate-x-1/2",
                  "h-3.5 w-3.5 rounded-full bg-[#ff3b3b]",
                  "shadow-[0_2px_8px_rgba(0,0,0,0.6)] border border-white/20",
                  "transition-all duration-150",
                  dragging ? "scale-110 opacity-100" : "opacity-0 group-hover/seek:opacity-100",
                ].join(" ")}
                style={{ left: `${playedPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Buttons row */}
        <div className="mt-1 flex items-center gap-1 sm:gap-2 text-white">
          <ControlButton onClick={togglePlay} label={isPlaying ? "Pause" : "Play"}>
            {isPlaying ? <Icon.Pause className="w-5 h-5" /> : <Icon.Play className="w-5 h-5 translate-x-[1px]" />}
          </ControlButton>

          <ControlButton onClick={() => seekBy(-10)} label="Back 10 seconds" className="hidden sm:inline-grid">
            <Icon.Back10 className="w-5 h-5" />
          </ControlButton>

          <ControlButton onClick={() => seekBy(10)} label="Forward 10 seconds" className="hidden sm:inline-grid">
            <Icon.Fwd10 className="w-5 h-5" />
          </ControlButton>

          {/* Volume cluster (expandable on hover) */}
          <div className="group/vol relative flex items-center">
            <ControlButton onClick={toggleMute} label={muted ? "Unmute" : "Mute"}>
              {(() => { const V = volumeIcon; return <V className="w-5 h-5" />; })()}
            </ControlButton>
            <div
              className={[
                "overflow-hidden transition-[width,opacity] duration-200",
                "w-0 opacity-0 group-hover/vol:w-20 group-hover/vol:opacity-100",
                "sm:flex items-center",
              ].join(" ")}
            >
              <div
                ref={volumeRef}
                onPointerDown={onVolumePointerDown}
                className="relative h-1 w-20 mx-2 bg-white/25 rounded-full cursor-pointer"
                role="slider"
                aria-label="Volume"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(volumePct)}
              >
                <div
                  className="absolute inset-y-0 left-0 bg-white rounded-full"
                  style={{ width: `${volumePct}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-white shadow"
                  style={{ left: `${volumePct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Time */}
          <div className="ml-1 text-xs sm:text-[13px] tabular-nums text-white/95 select-none">
            <span>{formatTime(currentTime)}</span>
            <span className="text-white/55"> / {formatTime(duration)}</span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Settings */}
          <div className="relative">
            <ControlButton
              onClick={() => {
                setShowSettings((s) => !s);
                setSettingsPane("root");
              }}
              label="Settings"
              active={showSettings}
            >
              <Icon.Settings className={["w-5 h-5 transition-transform duration-300", showSettings ? "rotate-45" : ""].join(" ")} />
            </ControlButton>
            {showSettings && (
              <SettingsMenu
                pane={settingsPane}
                setPane={setSettingsPane}
                playbackRate={playbackRate}
                onSetRate={setRate}
                qualities={qualities}
                activeQualityIdx={activeQualityIdx}
                onSetQuality={setQuality}
                onClose={() => setShowSettings(false)}
              />
            )}
          </div>

          <ControlButton onClick={togglePip} label="Picture in picture" active={isPip} className="hidden sm:inline-grid">
            <Icon.Pip className="w-5 h-5" />
          </ControlButton>

          <ControlButton onClick={toggleFullscreen} label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
            {isFullscreen ? <Icon.FullscreenExit className="w-5 h-5" /> : <Icon.FullscreenEnter className="w-5 h-5" />}
          </ControlButton>
        </div>
      </div>

      {/* ── Embedded keyframes / utilities ──────────────────────────────────── */}
      <style>{`
        @keyframes skipPulse {
          0%   { opacity: 0; transform: translateY(-50%) scale(0.85); }
          20%  { opacity: 1; transform: translateY(-50%) scale(1); }
          80%  { opacity: 1; transform: translateY(-50%) scale(1); }
          100% { opacity: 0; transform: translateY(-50%) scale(1.05); }
        }
      `}</style>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

interface ControlButtonProps {
  onClick: () => void;
  label: string;
  className?: string;
  active?: boolean;
  children: React.ReactNode;
}

function ControlButton({ onClick, label, className, active, children }: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={label}
      className={[
        "inline-grid place-items-center h-9 w-9 sm:h-10 sm:w-10 rounded-full",
        "text-white/90 hover:text-white",
        "transition-all duration-150",
        "hover:bg-white/12 active:scale-95",
        active ? "bg-white/15" : "",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

interface SettingsMenuProps {
  pane: "root" | "speed" | "quality";
  setPane: (p: "root" | "speed" | "quality") => void;
  playbackRate: number;
  onSetRate: (rate: number) => void;
  qualities?: QualitySource[];
  activeQualityIdx: number;
  onSetQuality: (idx: number) => void;
  onClose: () => void;
}

function SettingsMenu({
  pane,
  setPane,
  playbackRate,
  onSetRate,
  qualities,
  activeQualityIdx,
  onSetQuality,
  onClose,
}: SettingsMenuProps) {
  /* Close on outside click */
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDocPointer = (e: PointerEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    };
    /* defer one tick so the opening click doesn't immediately close */
    const t = setTimeout(() => document.addEventListener("pointerdown", onDocPointer), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("pointerdown", onDocPointer);
    };
  }, [onClose]);

  const activeQualityLabel = qualities?.[activeQualityIdx]?.label ?? "Auto";

  return (
    <div
      ref={ref}
      role="menu"
      className={[
        "absolute right-0 bottom-full mb-3",
        "min-w-[220px] max-w-[260px] rounded-xl overflow-hidden",
        "bg-black/85 backdrop-blur-xl border border-white/10",
        "shadow-[0_20px_50px_rgba(0,0,0,0.6)]",
        "text-sm text-white",
        "animate-[fadeInUp_180ms_ease-out]",
      ].join(" ")}
      onClick={(e) => e.stopPropagation()}
    >
      {pane === "root" && (
        <ul className="py-1.5">
          <SettingsRow
            label="Playback speed"
            value={playbackRate === 1 ? "Normal" : `${playbackRate}×`}
            onClick={() => setPane("speed")}
          />
          {qualities && qualities.length > 0 && (
            <SettingsRow
              label="Quality"
              value={activeQualityLabel}
              onClick={() => setPane("quality")}
            />
          )}
        </ul>
      )}

      {pane === "speed" && (
        <div>
          <SettingsHeader title="Playback speed" onBack={() => setPane("root")} />
          <ul className="py-1 max-h-72 overflow-auto">
            {SPEEDS.map((s) => (
              <SettingsCheckRow
                key={s}
                label={s === 1 ? "Normal" : `${s}×`}
                checked={s === playbackRate}
                onClick={() => {
                  onSetRate(s);
                  setPane("root");
                }}
              />
            ))}
          </ul>
        </div>
      )}

      {pane === "quality" && qualities && (
        <div>
          <SettingsHeader title="Quality" onBack={() => setPane("root")} />
          <ul className="py-1 max-h-72 overflow-auto">
            {qualities.map((q, idx) => (
              <SettingsCheckRow
                key={q.label}
                label={q.label}
                checked={idx === activeQualityIdx}
                onClick={() => {
                  onSetQuality(idx);
                  setPane("root");
                }}
              />
            ))}
          </ul>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function SettingsRow({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-white/8 transition-colors"
        role="menuitem"
      >
        <span className="text-white/90">{label}</span>
        <span className="flex items-center gap-1.5 text-white/65 text-xs">
          {value}
          <Icon.Chevron className="w-3.5 h-3.5" />
        </span>
      </button>
    </li>
  );
}

function SettingsHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="w-full flex items-center gap-2 px-3 py-2.5 border-b border-white/10 hover:bg-white/8 transition-colors"
    >
      <Icon.Chevron className="w-4 h-4 rotate-180 text-white/80" />
      <span className="text-[13px] font-semibold text-white">{title}</span>
    </button>
  );
}

function SettingsCheckRow({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={[
          "w-full flex items-center gap-2 px-3.5 py-2.5 transition-colors",
          checked ? "bg-white/8 text-white" : "text-white/85 hover:bg-white/8",
        ].join(" ")}
        role="menuitemradio"
        aria-checked={checked}
      >
        <span className="w-4 h-4 inline-grid place-items-center">
          {checked && <Icon.Check className="w-4 h-4 text-[#ff3b3b]" />}
        </span>
        <span>{label}</span>
      </button>
    </li>
  );
}
