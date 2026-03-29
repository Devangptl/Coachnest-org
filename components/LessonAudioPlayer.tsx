"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, Square, ChevronLeft, ChevronRight,
  Volume2, X, Headphones, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  text: string;
  lessonTitle?: string;
  onClose: () => void;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;
type Speed = typeof SPEEDS[number];

type Status = "idle" | "loading" | "playing" | "paused";

// ─── Strip markdown to plain text ────────────────────────────────────────────

function markdownToPlain(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/#{1,6}\s+/g, "")
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toParagraphs(plain: string): string[] {
  return plain
    .split(/\n\n+/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter((p) => p.length > 10); // skip very short fragments
}

// ─── Waveform ─────────────────────────────────────────────────────────────────

const BAR_HEIGHTS = [40, 70, 55, 90, 45, 75, 60, 85, 50, 65, 80, 45, 70, 55, 90];

function Waveform({ playing, loading }: { playing: boolean; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-1 h-8 w-16">
        <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-[3px] h-8">
      {BAR_HEIGHTS.map((h, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-emerald-400"
          animate={
            playing
              ? { scaleY: [1, h / 50, 0.4, h / 60, 1], opacity: [0.6, 1, 0.5, 1, 0.6] }
              : { scaleY: 0.25, opacity: 0.3 }
          }
          transition={
            playing
              ? { duration: 0.8 + (i % 4) * 0.15, repeat: Infinity, ease: "easeInOut", delay: i * 0.05 }
              : { duration: 0.3 }
          }
          style={{ height: 28, transformOrigin: "center" }}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LessonAudioPlayer({ text, lessonTitle, onClose }: Props) {
  const paragraphs = useRef<string[]>(toParagraphs(markdownToPlain(text)));
  const total = paragraphs.current.length;

  // Render state
  const [status, setStatus] = useState<Status>("loading");
  const [para,   setPara]   = useState(0);
  const [speed,  setSpeed]  = useState<Speed>(1);

  // Refs — always up-to-date inside callbacks (avoids stale closures)
  const statusRef = useRef<Status>("loading");
  const paraRef   = useRef(0);
  const speedRef  = useRef<Speed>(1);

  // Keep-alive timer (fixes Chrome ≤ ~15-second speech cutoff bug)
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Helpers to update both state + ref atomically ──────────────────────────
  const updStatus = useCallback((s: Status) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const updPara = useCallback((p: number) => {
    paraRef.current = p;
    setPara(p);
  }, []);

  const updSpeed = useCallback((s: Speed) => {
    speedRef.current = s;
    setSpeed(s);
  }, []);

  // ── Keep-alive: pause+resume every 14 s to beat Chrome's timer ─────────────
  const startKeepAlive = useCallback(() => {
    if (keepAliveRef.current) clearInterval(keepAliveRef.current);
    keepAliveRef.current = setInterval(() => {
      if (typeof window !== "undefined" && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 14000);
  }, []);

  const stopKeepAlive = useCallback(() => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
  }, []);

  // ── Voice readiness — retry up to 2 s across all browsers ─────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      updStatus("idle"); // no TTS support — still allow attempt
      return;
    }

    let stopped = false;
    let attempts = 0;

    function tryLoad() {
      if (stopped) return;
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0 || attempts >= 10) {
        updStatus("idle");
      } else {
        attempts++;
        setTimeout(tryLoad, 200);
      }
    }

    tryLoad();
    window.speechSynthesis.addEventListener("voiceschanged", tryLoad);

    return () => {
      stopped = true;
      window.speechSynthesis.removeEventListener("voiceschanged", tryLoad);
    };
  }, [updStatus]);

  // ── Cancel + cleanup on unmount ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      stopKeepAlive();
    };
  }, [stopKeepAlive]);

  // ── Core speak function ────────────────────────────────────────────────────
  const speakPara = useCallback(
    (index: number, rate: number) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;

      if (index >= total) {
        // Finished all paragraphs
        updStatus("idle");
        updPara(0);
        stopKeepAlive();
        return;
      }

      // Cancel any existing speech, then wait 50 ms for Chrome to clean up
      window.speechSynthesis.cancel();

      setTimeout(() => {
        // Guard: user may have paused/stopped during the 50 ms delay
        if (statusRef.current === "paused" || statusRef.current === "idle") return;

        const utt = new SpeechSynthesisUtterance(paragraphs.current[index]);
        utt.rate  = rate;
        utt.pitch = 1;

        const voices = window.speechSynthesis.getVoices();
        const preferred =
          voices.find((v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("google")) ||
          voices.find((v) => v.lang.startsWith("en")) ||
          voices[0];
        if (preferred) utt.voice = preferred;

        utt.onstart = () => {
          updPara(index);
          updStatus("playing");
          startKeepAlive();
        };

        utt.onend = () => {
          // Only advance if still playing (not manually stopped/paused)
          if (statusRef.current === "playing") {
            speakPara(index + 1, speedRef.current);
          }
        };

        utt.onerror = (e) => {
          // "interrupted" / "cancelled" just means we cancelled it ourselves — not an error
          if (e.error !== "interrupted" && e.error !== "canceled") {
            updStatus("idle");
            stopKeepAlive();
          }
        };

        window.speechSynthesis.speak(utt);
      }, 50);
    },
    [total, updStatus, updPara, startKeepAlive, stopKeepAlive]
  );

  // ── Controls ───────────────────────────────────────────────────────────────

  function handlePlay() {
    if (statusRef.current === "loading") return;
    // Use ref values to avoid stale closures
    const startIdx = statusRef.current === "idle" ? 0 : paraRef.current;
    updStatus("playing"); // optimistic — onstart will confirm
    speakPara(startIdx, speedRef.current);
  }

  function handlePause() {
    if (statusRef.current !== "playing") return;
    // Cancel is reliable; native pause() is not (Chrome bug)
    window.speechSynthesis.cancel();
    stopKeepAlive();
    updStatus("paused");
    // paraRef.current already holds the current paragraph position
  }

  function handleStop() {
    window.speechSynthesis.cancel();
    stopKeepAlive();
    updStatus("idle");
    updPara(0);
  }

  function handlePrev() {
    const target = Math.max(0, paraRef.current - 1);
    if (statusRef.current === "playing" || statusRef.current === "paused") {
      updStatus("playing");
      speakPara(target, speedRef.current);
    } else {
      updPara(target);
    }
  }

  function handleNext() {
    const target = Math.min(total - 1, paraRef.current + 1);
    if (statusRef.current === "playing" || statusRef.current === "paused") {
      updStatus("playing");
      speakPara(target, speedRef.current);
    } else {
      updPara(target);
    }
  }

  function handleSpeedChange(s: Speed) {
    updSpeed(s);
    if (statusRef.current === "playing") {
      speakPara(paraRef.current, s);
    }
  }

  function handleClose() {
    window.speechSynthesis.cancel();
    stopKeepAlive();
    onClose();
  }

  // ── Derived display values ─────────────────────────────────────────────────
  const isPlaying = status === "playing";
  const isLoading = status === "loading";
  const progress  = total > 0 ? Math.round(((para + (isPlaying ? 0.5 : 0)) / total) * 100) : 0;

  const statusLabel = isLoading
    ? "Loading voices…"
    : isPlaying
    ? `Reading section ${para + 1} of ${total}`
    : status === "paused"
    ? `Paused · section ${para + 1} of ${total}`
    : para === 0
    ? `${total} section${total !== 1 ? "s" : ""} · tap ▶ to start`
    : `Stopped · ${progress}% read`;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 340, damping: 26 }}
      className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/80 via-card/95 to-card/95 backdrop-blur-xl shadow-2xl shadow-emerald-900/30 overflow-hidden"
    >
      {/* Top glow line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center flex-shrink-0">
              <Headphones className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold leading-tight">Audio Mode</p>
              {lessonTitle && (
                <p className="text-emerald-400/70 text-[11px] truncate max-w-[200px]">{lessonTitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Speed selector */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-white/5 border border-white/[0.08]">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={cn(
                    "px-2 py-1 text-[11px] font-semibold rounded-md transition-all",
                    speed === s
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "text-white/30 hover:text-white/60"
                  )}
                >
                  {s}×
                </button>
              ))}
            </div>

            {/* Close */}
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 flex items-center justify-center transition-all"
              aria-label="Close audio player"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Waveform + controls row */}
        <div className="flex items-center gap-4 mb-5">
          {/* Waveform */}
          <div className="flex-shrink-0">
            <Waveform playing={isPlaying} loading={isLoading} />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Prev */}
            <button
              onClick={handlePrev}
              disabled={para === 0 || isLoading}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/[0.08] hover:border-white/[0.15] text-white/50 hover:text-white/80 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="Previous section"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Play / Pause */}
            <motion.button
              onClick={isPlaying ? handlePause : handlePlay}
              disabled={isLoading}
              whileTap={{ scale: 0.92 }}
              className={cn(
                "relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all overflow-hidden",
                "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-600/30",
                "hover:from-emerald-400 hover:to-emerald-500",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying && (
                <motion.div
                  className="absolute inset-0 rounded-2xl border-2 border-emerald-400"
                  animate={{ scale: [1, 1.18], opacity: [0.6, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                />
              )}
              <AnimatePresence mode="wait" initial={false}>
                {isLoading ? (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </motion.div>
                ) : isPlaying ? (
                  <motion.div
                    key="pause"
                    initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Pause className="w-5 h-5 text-white" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="play"
                    initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Play className="w-5 h-5 text-white ml-0.5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Next */}
            <button
              onClick={handleNext}
              disabled={para >= total - 1 || isLoading}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/[0.08] hover:border-white/[0.15] text-white/50 hover:text-white/80 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next section"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Stop — visible only when active */}
            <AnimatePresence>
              {(isPlaying || status === "paused") && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  onClick={handleStop}
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-red-500/15 border border-white/[0.08] hover:border-red-500/30 text-white/40 hover:text-red-400 flex items-center justify-center transition-all"
                  title="Stop"
                >
                  <Square className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <Volume2 className="w-4 h-4 text-emerald-400/50 flex-shrink-0 ml-auto" />
        </div>

        {/* Progress bar — one segment per paragraph */}
        <div className="space-y-2">
          <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
            {paragraphs.current.map((_, i) => (
              <motion.button
                key={i}
                onClick={() => {
                  if (statusRef.current === "playing" || statusRef.current === "paused") {
                    updStatus("playing");
                    speakPara(i, speedRef.current);
                  } else {
                    updPara(i);
                  }
                }}
                className={cn(
                  "flex-1 h-full rounded-full transition-colors cursor-pointer",
                  i < para
                    ? "bg-emerald-500"
                    : i === para
                    ? "bg-emerald-400"
                    : "bg-white/10 hover:bg-white/20"
                )}
                animate={i === para && isPlaying ? { opacity: [0.7, 1, 0.7] } : {}}
                transition={{ duration: 1.4, repeat: Infinity }}
              />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-white/30 text-[10px]">{statusLabel}</span>
            <span className="text-emerald-400/60 text-[10px] font-semibold">{progress}%</span>
          </div>
        </div>

        {/* Current paragraph preview */}
        <AnimatePresence mode="wait">
          {paragraphs.current[para] && (isPlaying || status === "paused") && (
            <motion.div
              key={para}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-3 pt-3 border-t border-white/[0.06]"
            >
              <p className="text-white/40 text-[11px] leading-relaxed line-clamp-2 italic">
                &ldquo;{paragraphs.current[para].slice(0, 120)}
                {paragraphs.current[para].length > 120 ? "…" : ""}&rdquo;
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
