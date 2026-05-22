"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  onPlayingChange?: (playing: boolean) => void;
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

// Split a paragraph into words, keeping each word's character offset so
// SpeechSynthesis `onboundary` charIndex events can be mapped to a word.
interface WordToken { w: string; start: number }

function wordsOf(p: string): WordToken[] {
  const out: WordToken[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(p)) !== null) out.push({ w: m[0], start: m.index });
  return out;
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

export default function LessonAudioPlayer({ text, lessonTitle, onClose, onPlayingChange }: Props) {
  const paragraphs = useRef<string[]>(toParagraphs(markdownToPlain(text)));
  const total = paragraphs.current.length;
  const useSegmented = total <= 20;

  // Per-paragraph word tokens — used for karaoke-style word highlighting.
  const wordsByPara = useRef<WordToken[][]>(paragraphs.current.map(wordsOf));

  // Render state
  const [status, setStatus] = useState<Status>("loading");
  const [para,   setPara]   = useState(0);
  const [speed,  setSpeed]  = useState<Speed>(1);
  const [charIdx, setCharIdx] = useState(-1); // char offset of word being spoken

  // Refs — always up-to-date inside callbacks (avoids stale closures)
  const statusRef = useRef<Status>("loading");
  const paraRef   = useRef(0);
  const speedRef  = useRef<Speed>(1);

  // Keep-alive timer (fixes Chrome ≤ ~15-second speech cutoff bug)
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Transcript scroll container + active-paragraph element
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const activeParaRef = useRef<HTMLButtonElement | null>(null);

  // ── Helpers to update both state + ref atomically ──────────────────────────
  const updStatus = useCallback((s: Status) => {
    statusRef.current = s;
    setStatus(s);
    onPlayingChange?.(s === "playing");
  }, [onPlayingChange]);

  const updPara = useCallback((p: number) => {
    paraRef.current = p;
    setPara(p);
    setCharIdx(-1);
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

  // ── Keep the active paragraph centred in the transcript panel ──────────────
  useEffect(() => {
    const el = activeParaRef.current;
    const container = transcriptRef.current;
    if (!el || !container) return;
    const top = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;
    container.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [para]);

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

        // Word-level boundary events drive the karaoke highlight.
        utt.onboundary = (e) => {
          if (e.name === "word" || e.name === undefined) {
            setCharIdx(e.charIndex);
          }
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

  function jumpTo(target: number) {
    const clamped = Math.max(0, Math.min(total - 1, target));
    if (statusRef.current === "playing" || statusRef.current === "paused") {
      updStatus("playing");
      speakPara(clamped, speedRef.current);
    } else {
      updPara(clamped);
    }
  }

  function handlePrev() { jumpTo(paraRef.current - 1); }
  function handleNext() { jumpTo(paraRef.current + 1); }

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

  // Index of the word currently being spoken in the active paragraph.
  const curWordIdx = useMemo(() => {
    if (charIdx < 0) return -1;
    const words = wordsByPara.current[para] ?? [];
    let idx = -1;
    for (let i = 0; i < words.length; i++) {
      if (words[i].start <= charIdx) idx = i;
      else break;
    }
    return idx;
  }, [charIdx, para]);

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
      className="overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 via-card to-card shadow-xl shadow-emerald-950/20"
    >
      {/* Top glow line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

      <div className="p-4 sm:p-5">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center flex-shrink-0">
              <Headphones className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-foreground text-sm font-semibold leading-tight">Read Along</p>
              <p className="text-emerald-400/70 text-[11px] truncate">
                {lessonTitle || "Listen & follow the text"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Speed selector */}
            <div className="hidden sm:flex items-center gap-0.5 p-0.5 rounded-lg bg-white/5 border border-white/[0.08]">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={cn(
                    "px-1.5 sm:px-2 py-1 text-[11px] font-semibold rounded-md transition-all",
                    speed === s
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "text-muted-foreground/40 hover:text-muted-foreground"
                  )}
                >
                  {s}×
                </button>
              ))}
            </div>

            {/* Close */}
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground/50 hover:text-foreground flex items-center justify-center transition-all"
              aria-label="Close audio player"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Waveform + controls row */}
        <div className="flex items-center gap-3 sm:gap-4 mb-4">
          {/* Waveform */}
          <div className="flex-shrink-0 hidden sm:block">
            <Waveform playing={isPlaying} loading={isLoading} />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Prev */}
            <button
              onClick={handlePrev}
              disabled={para === 0 || isLoading}
              className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/[0.08] hover:border-white/[0.15] text-muted-foreground/60 hover:text-foreground flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
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
                "relative w-12 h-12 rounded-xl flex items-center justify-center transition-all overflow-hidden",
                "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-600/30",
                "hover:from-emerald-400 hover:to-emerald-500",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying && (
                <motion.div
                  className="absolute inset-0 rounded-xl border-2 border-emerald-400"
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
              className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/[0.08] hover:border-white/[0.15] text-muted-foreground/60 hover:text-foreground flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next section"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Stop — visible only when active */}
            <AnimatePresence>
              {(isPlaying || status === "paused") && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.7, width: 0 }}
                  animate={{ opacity: 1, scale: 1, width: 36 }}
                  exit={{ opacity: 0, scale: 0.7, width: 0 }}
                  onClick={handleStop}
                  className="h-9 rounded-lg bg-white/5 hover:bg-red-500/15 border border-white/[0.08] hover:border-red-500/30 text-muted-foreground/50 hover:text-red-400 flex items-center justify-center transition-colors flex-shrink-0"
                  title="Stop"
                >
                  <Square className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Speed selector — compact, shown on very small screens */}
          <div className="flex sm:hidden items-center gap-0.5 p-0.5 rounded-lg bg-white/5 border border-white/[0.08] ml-auto">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                className={cn(
                  "px-1.5 py-1 text-[10px] font-semibold rounded-md transition-all",
                  speed === s
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "text-muted-foreground/40"
                )}
              >
                {s}×
              </button>
            ))}
          </div>

          <Volume2 className="w-4 h-4 text-emerald-400/50 flex-shrink-0 ml-auto hidden sm:block" />
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          {useSegmented ? (
            /* Segmented pips — one per paragraph (≤20 paragraphs) */
            <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
              {paragraphs.current.map((_, i) => (
                <motion.button
                  key={i}
                  onClick={() => jumpTo(i)}
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
          ) : (
            /* Smooth continuous bar with click-to-seek (>20 paragraphs) */
            <div
              className="relative h-1.5 rounded-full bg-white/10 overflow-hidden group cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const target = Math.floor(((e.clientX - rect.left) / rect.width) * total);
                jumpTo(target);
              }}
            >
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
              {Array.from({ length: Math.min(total - 1, 40) }, (_, i) => {
                const tickCount = Math.min(total - 1, 40);
                const pct = ((i + 1) / (tickCount + 1)) * 100;
                return (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 w-px bg-black/20 group-hover:bg-black/40 transition-colors"
                    style={{ left: `${pct}%` }}
                  />
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground/40 text-[10px]">{statusLabel}</span>
            <span className="text-emerald-400/60 text-[10px] font-semibold">{progress}%</span>
          </div>
        </div>

        {/* ── Synced read-along transcript ─────────────────────────────────── */}
        {total > 0 && (
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <p className="text-muted-foreground/40 text-[10px] uppercase tracking-wider mb-2 font-medium flex items-center gap-1.5">
              <span className={cn("w-1.5 h-1.5 rounded-full", isPlaying ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/30")} />
              Transcript · tap any line to jump
            </p>
            <div
              ref={transcriptRef}
              className="max-h-[260px] overflow-y-auto pr-1.5 space-y-1 select-none scroll-smooth"
            >
              {paragraphs.current.map((p, i) => {
                const isActive = i === para;
                return (
                  <button
                    key={i}
                    ref={isActive ? activeParaRef : undefined}
                    onClick={() => jumpTo(i)}
                    className={cn(
                      "block w-full text-left rounded-lg px-3 py-2 transition-colors",
                      isActive
                        ? "bg-emerald-500/10 ring-1 ring-emerald-500/25"
                        : "hover:bg-white/[0.03]"
                    )}
                  >
                    <span
                      className={cn(
                        "text-[13px] leading-relaxed",
                        isActive
                          ? "text-foreground"
                          : i < para
                          ? "text-muted-foreground/45"
                          : "text-muted-foreground/70"
                      )}
                    >
                      {isActive ? (
                        // Karaoke word highlighting for the paragraph being read.
                        <ActiveParagraph
                          words={wordsByPara.current[i]}
                          curWordIdx={curWordIdx}
                        />
                      ) : (
                        p
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Active paragraph with karaoke word highlighting ──────────────────────────

function ActiveParagraph({ words, curWordIdx }: { words: WordToken[]; curWordIdx: number }) {
  return (
    <>
      {words.map((token, i) => {
        const isCurrent = i === curWordIdx;
        const isPast = curWordIdx >= 0 && i < curWordIdx;
        return (
          <span
            key={i}
            className={cn(
              "transition-colors duration-150",
              isCurrent
                ? "rounded bg-emerald-400/25 text-emerald-200 font-medium px-0.5"
                : isPast
                ? "text-emerald-400/70"
                : "text-foreground/85"
            )}
          >
            {token.w}{i < words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </>
  );
}
