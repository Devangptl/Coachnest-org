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

// Keeping every spoken utterance short avoids Chrome's ~15-second speech
// cutoff bug entirely — far more reliable than the pause/resume keep-alive
// hack, which itself sometimes stalls playback.
const MIN_CHUNK = 60;
const MAX_CHUNK = 130;

// Many Chrome voices (notably remote Google voices) never fire `onboundary`
// events, so the karaoke highlight cannot rely on them alone. A timing
// estimator drives the highlight for those voices and auto-calibrates from
// each chunk's measured duration. When real boundary events do arrive, they
// re-anchor the estimator for exact accuracy.
const DEFAULT_CHARS_PER_SEC = 14.5; // at rate 1.0, before calibration

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

// A chunk is a short slice of a paragraph that gets spoken as one utterance.
// `offset` is the chunk's start position within its paragraph, used to map
// per-utterance boundary events back to paragraph-relative word positions.
interface Chunk { paraIdx: number; text: string; offset: number }

function buildChunks(paras: string[]): Chunk[] {
  const chunks: Chunk[] = [];
  paras.forEach((p, paraIdx) => {
    const words = wordsOf(p);
    if (words.length === 0) return;
    let startWord = 0;
    for (let i = 0; i < words.length; i++) {
      const chunkStart = words[startWord].start;
      const wordEnd = words[i].start + words[i].w.length;
      const len = wordEnd - chunkStart;
      const endsSentence = /[.!?:;]["')\]]?$/.test(words[i].w);
      const atLast = i === words.length - 1;
      if (atLast || len >= MAX_CHUNK || (endsSentence && len >= MIN_CHUNK)) {
        chunks.push({ paraIdx, text: p.slice(chunkStart, wordEnd), offset: chunkStart });
        startWord = i + 1;
      }
    }
  });
  return chunks;
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

  // Per-paragraph word tokens (karaoke highlight) + flat list of speech chunks.
  const wordsByPara = useRef<WordToken[][]>(paragraphs.current.map(wordsOf));
  const chunks = useRef<Chunk[]>(buildChunks(paragraphs.current));

  // Render state
  const [status, setStatus] = useState<Status>("loading");
  const [para,   setPara]   = useState(0);
  const [speed,  setSpeed]  = useState<Speed>(1);
  const [charIdx, setCharIdx] = useState(-1); // char offset (paragraph-relative) of spoken word

  // Refs — always up-to-date inside callbacks (avoids stale closures)
  const statusRef = useRef<Status>("loading");
  const paraRef   = useRef(0);
  const speedRef  = useRef<Speed>(1);
  const chunkRef  = useRef(0); // index into chunks.current

  // Word-timing estimator state
  const estimatorRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentChunkRef = useRef<Chunk | null>(null);
  const anchorCharRef  = useRef(0);   // chunk-relative char position of last known word
  const anchorTimeRef  = useRef(0);   // performance.now() of that anchor
  const speakStartRef  = useRef(0);   // performance.now() the chunk started speaking
  const charsPerSecRef = useRef(DEFAULT_CHARS_PER_SEC); // calibrated, rate-normalised

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

  // ── First chunk index belonging to a given paragraph ───────────────────────
  const firstChunkOfPara = useCallback((paraIdx: number) => {
    const idx = chunks.current.findIndex((c) => c.paraIdx >= paraIdx);
    return idx < 0 ? chunks.current.length : idx;
  }, []);

  // ── Word-timing estimator ──────────────────────────────────────────────────
  const stopEstimator = useCallback(() => {
    if (estimatorRef.current) {
      clearInterval(estimatorRef.current);
      estimatorRef.current = null;
    }
  }, []);

  const startEstimator = useCallback(() => {
    stopEstimator();
    estimatorRef.current = setInterval(() => {
      if (statusRef.current !== "playing") return;
      const chunk = currentChunkRef.current;
      if (!chunk) return;
      const elapsed = (performance.now() - anchorTimeRef.current) / 1000;
      const est = anchorCharRef.current + elapsed * charsPerSecRef.current * speedRef.current;
      const maxChar = Math.max(0, chunk.text.length - 1);
      setCharIdx(chunk.offset + Math.min(est, maxChar));
    }, 70);
  }, [stopEstimator]);

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
      stopEstimator();
    };
  }, [stopEstimator]);

  // ── Keep the active paragraph centred in the transcript panel ──────────────
  useEffect(() => {
    const el = activeParaRef.current;
    const container = transcriptRef.current;
    if (!el || !container) return;
    const top = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;
    container.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [para]);

  // ── Core speak function — speaks one chunk, then chains to the next ────────
  const speak = useCallback(
    (chunkIndex: number, rate: number, immediate: boolean) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;

      if (chunkIndex >= chunks.current.length) {
        // Finished the whole lesson
        stopEstimator();
        updStatus("idle");
        updPara(0);
        chunkRef.current = 0;
        return;
      }

      const doSpeak = () => {
        // Guard: user may have paused/stopped during the delay
        if (statusRef.current === "paused" || statusRef.current === "idle") return;

        const chunk = chunks.current[chunkIndex];
        currentChunkRef.current = chunk;
        const utt = new SpeechSynthesisUtterance(chunk.text);
        utt.rate  = rate;
        utt.pitch = 1;

        const voices = window.speechSynthesis.getVoices();
        const preferred =
          voices.find((v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("google")) ||
          voices.find((v) => v.lang.startsWith("en")) ||
          voices[0];
        if (preferred) utt.voice = preferred;

        utt.onstart = () => {
          chunkRef.current = chunkIndex;
          if (paraRef.current !== chunk.paraIdx) updPara(chunk.paraIdx);
          // Anchor the estimator at the start of this chunk.
          anchorCharRef.current = 0;
          anchorTimeRef.current = performance.now();
          speakStartRef.current = anchorTimeRef.current;
          setCharIdx(chunk.offset);
          updStatus("playing");
          startEstimator();
        };

        // Real word-boundary events (local voices) re-anchor the estimator
        // for exact accuracy; remote voices simply never fire these.
        utt.onboundary = (e) => {
          if (e.name === "word" || e.name === undefined) {
            anchorCharRef.current = e.charIndex;
            anchorTimeRef.current = performance.now();
            setCharIdx(chunk.offset + e.charIndex);
          }
        };

        utt.onend = () => {
          stopEstimator();
          // Calibrate speaking rate from this chunk's measured duration.
          const dur = (performance.now() - speakStartRef.current) / 1000;
          if (dur > 0.4) {
            const measured = chunk.text.length / dur / rate;
            charsPerSecRef.current = charsPerSecRef.current * 0.4 + measured * 0.6;
          }
          // Advance to the next chunk only if still playing
          if (statusRef.current === "playing") {
            speak(chunkIndex + 1, speedRef.current, true);
          }
        };

        utt.onerror = (e) => {
          // "interrupted" / "canceled" just means we cancelled it ourselves
          if (e.error !== "interrupted" && e.error !== "canceled") {
            stopEstimator();
            updStatus("idle");
          }
        };

        window.speechSynthesis.speak(utt);
      };

      if (immediate) {
        // Chaining from onend — break out of the event handler before speaking
        setTimeout(doSpeak, 0);
      } else {
        // Fresh start / seek — clear the queue first, then let Chrome settle
        window.speechSynthesis.cancel();
        setTimeout(doSpeak, 60);
      }
    },
    [updStatus, updPara, startEstimator, stopEstimator]
  );

  // ── Controls ───────────────────────────────────────────────────────────────

  function handlePlay() {
    if (statusRef.current === "loading" || total === 0) return;
    const startChunk = statusRef.current === "idle" ? 0 : chunkRef.current;
    updStatus("playing"); // optimistic — onstart will confirm
    speak(startChunk, speedRef.current, false);
  }

  function handlePause() {
    if (statusRef.current !== "playing") return;
    // Cancel is reliable; native pause() is not (Chrome bug)
    window.speechSynthesis.cancel();
    stopEstimator();
    updStatus("paused");
    // chunkRef.current already holds the current chunk position
  }

  function handleStop() {
    window.speechSynthesis.cancel();
    stopEstimator();
    updStatus("idle");
    updPara(0);
    chunkRef.current = 0;
  }

  function jumpToPara(target: number) {
    const clamped = Math.max(0, Math.min(total - 1, target));
    const chunkIndex = firstChunkOfPara(clamped);
    chunkRef.current = chunkIndex;
    if (statusRef.current === "playing" || statusRef.current === "paused") {
      updStatus("playing");
      speak(chunkIndex, speedRef.current, false);
    } else {
      updPara(clamped);
    }
  }

  function handlePrev() { jumpToPara(paraRef.current - 1); }
  function handleNext() { jumpToPara(paraRef.current + 1); }

  function handleSpeedChange(s: Speed) {
    updSpeed(s);
    if (statusRef.current === "playing") {
      speak(chunkRef.current, s, false);
    }
  }

  function handleClose() {
    window.speechSynthesis.cancel();
    stopEstimator();
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
      className="w-full overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 via-card to-card shadow-xl shadow-emerald-950/20"
    >
      {/* Top glow line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

      <div className="p-3.5 sm:p-5">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center flex-shrink-0">
              <Headphones className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-foreground text-sm font-semibold leading-tight">Read Along</p>
              <p className="text-emerald-400/70 text-[11px] truncate">
                {lessonTitle || "Listen & follow the text"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Speed selector — wide screens */}
            <div className="hidden sm:flex items-center gap-0.5 p-0.5 rounded-lg bg-white/5 border border-white/[0.08]">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={cn(
                    "px-2 py-1 text-[11px] font-semibold rounded-md transition-all",
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
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground/50 hover:text-foreground flex items-center justify-center transition-all flex-shrink-0"
              aria-label="Close audio player"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Waveform + controls row */}
        <div className="flex items-center gap-3 sm:gap-4 mb-4">
          {/* Waveform — hidden on small screens to save width */}
          <div className="flex-shrink-0 hidden sm:block">
            <Waveform playing={isPlaying} loading={isLoading} />
          </div>

          {/* Transport controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
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
                "relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all overflow-hidden",
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
            <AnimatePresence initial={false}>
              {(isPlaying || status === "paused") && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  onClick={handleStop}
                  className="w-9 h-9 rounded-lg bg-white/5 hover:bg-red-500/15 border border-white/[0.08] hover:border-red-500/30 text-muted-foreground/50 hover:text-red-400 flex items-center justify-center transition-colors flex-shrink-0"
                  title="Stop"
                >
                  <Square className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Right side: speed selector (small screens) / volume icon */}
          <div className="flex items-center justify-end flex-1 min-w-0">
            <div className="flex sm:hidden items-center gap-0.5 p-0.5 rounded-lg bg-white/5 border border-white/[0.08]">
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
            <Volume2 className="w-4 h-4 text-emerald-400/50 flex-shrink-0 hidden sm:block" />
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          {useSegmented ? (
            /* Segmented pips — one per paragraph (≤20 paragraphs) */
            <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
              {paragraphs.current.map((_, i) => (
                <motion.button
                  key={i}
                  onClick={() => jumpToPara(i)}
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
              className="relative h-2 rounded-full bg-white/10 overflow-hidden group cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const target = Math.floor(((e.clientX - rect.left) / rect.width) * total);
                jumpToPara(target);
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

          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground/40 text-[10px] truncate">{statusLabel}</span>
            <span className="text-emerald-400/60 text-[10px] font-semibold flex-shrink-0">{progress}%</span>
          </div>
        </div>

        {/* ── Synced read-along transcript ─────────────────────────────────── */}
        {total > 0 && (
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <p className="text-muted-foreground/40 text-[10px] uppercase tracking-wider mb-2 font-medium flex items-center gap-1.5">
              <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", isPlaying ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/30")} />
              Transcript · tap any line to jump
            </p>
            <div
              ref={transcriptRef}
              className="max-h-[180px] sm:max-h-[280px] overflow-y-auto pr-1 sm:pr-1.5 space-y-1 select-none scroll-smooth overscroll-contain"
            >
              {paragraphs.current.map((p, i) => {
                const isActive = i === para;
                return (
                  <button
                    key={i}
                    ref={isActive ? activeParaRef : undefined}
                    onClick={() => jumpToPara(i)}
                    className={cn(
                      "block w-full text-left rounded-lg px-2.5 sm:px-3 py-2 transition-colors",
                      isActive
                        ? "bg-emerald-500/10 ring-1 ring-emerald-500/25"
                        : "hover:bg-white/[0.03] active:bg-white/[0.05]"
                    )}
                  >
                    <span
                      className={cn(
                        "text-[12px] sm:text-[13px] leading-relaxed break-words",
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
