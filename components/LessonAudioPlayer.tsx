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
// cutoff bug entirely.
const MIN_CHUNK = 60;
const MAX_CHUNK = 130;

// Many Chrome voices (notably remote Google voices) never fire `onboundary`
// events, so a timing estimator drives the highlight and auto-calibrates from
// each chunk's measured duration. Real boundary events re-anchor it.
const DEFAULT_CHARS_PER_SEC = 14.5; // at rate 1.0, before calibration

// ─── Language detection ──────────────────────────────────────────────────────
// Picks a BCP-47 language tag from the script of the text. Without this the
// speech engine pronounces Gujarati/Hindi script with English phonetics.

const GU_RE = /[઀-૿]/; // Gujarati block
const HI_RE = /[ऀ-ॿ]/; // Devanagari block (Hindi / Marathi)

function detectLang(text: string): "gu-IN" | "hi-IN" | "en-US" {
  if (GU_RE.test(text)) return "gu-IN";
  if (HI_RE.test(text)) return "hi-IN";
  return "en-US";
}

/** Choose the best available voice for a target BCP-47 language. */
function pickVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | undefined {
  if (!voices.length) return undefined;
  const base = lang.split("-")[0];
  return (
    voices.find((v) => v.lang.toLowerCase() === lang.toLowerCase() && /google/i.test(v.name)) ||
    voices.find((v) => v.lang.toLowerCase() === lang.toLowerCase()) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(base + "-")) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(base)) ||
    // Indic fallback: Hindi voices generally read Gujarati script better than
    // an English voice would, even if pronunciation isn't perfect.
    (base === "gu" ? voices.find((v) => v.lang.toLowerCase().startsWith("hi")) : undefined) ||
    voices.find((v) => v.lang.startsWith("en") && /google/i.test(v.name)) ||
    voices.find((v) => v.lang.startsWith("en")) ||
    voices[0]
  );
}

// ─── Section model ───────────────────────────────────────────────────────────
// Lesson content is parsed into ordered sections. Text sections drive
// word-level karaoke highlighting; table sections render as a real table with
// the row being read highlighted.

interface TextSection { kind: "text"; text: string }
interface TableSection {
  kind: "table";
  header: string[];
  rows: string[][];
  spoken: string;                              // readable text spoken aloud
  rowSpans: { start: number; end: number }[];  // char range of each row in `spoken`
}
type Section = TextSection | TableSection;

// Plain-text helpers ──────────────────────────────────────────────────────────

function stripInline(s: string): string {
  return s
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

function stripCell(s: string): string {
  return s
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

function toParagraphs(plain: string): string[] {
  return plain
    .split(/\n\n+/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter((p) => p.length > 10);
}

// Table-row detection
const tableCells = (l: string) =>
  l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
const isTableRow = (l: string) => l.includes("|") && l.trim().length > 0;
const isTableSep = (l: string) => {
  if (!l.includes("-")) return false;
  const cells = tableCells(l);
  return cells.length > 0 && cells.every((c) => /^:?-{1,}:?$/.test(c));
};

function buildTableSection(header: string[], rows: string[][]): TableSection {
  const rowSentences = rows.map((cells) =>
    cells
      .map((c, idx) => {
        if (!c) return "";
        const h = header[idx];
        return h ? `${h}: ${c}` : c;
      })
      .filter(Boolean)
      .join(", ") + "."
  );
  let spoken = "";
  const rowSpans: { start: number; end: number }[] = [];
  rowSentences.forEach((s, idx) => {
    if (idx > 0) spoken += " ";
    const start = spoken.length;
    spoken += s;
    rowSpans.push({ start, end: spoken.length });
  });
  if (!spoken) spoken = header.filter(Boolean).join(", ") + ".";
  return { kind: "table", header, rows, spoken, rowSpans };
}

// Parse markdown into ordered text/table sections.
function parseSections(md: string): Section[] {
  const clean = md.replace(/```[\s\S]*?```/g, "").replace(/`[^`]+`/g, "");
  const lines = clean.split("\n");
  const sections: Section[] = [];
  let buf: string[] = [];

  const flushText = () => {
    if (!buf.length) return;
    toParagraphs(stripInline(buf.join("\n"))).forEach((t) =>
      sections.push({ kind: "text", text: t })
    );
    buf = [];
  };

  let i = 0;
  while (i < lines.length) {
    if (isTableRow(lines[i]) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      flushText();
      const header = tableCells(lines[i]).map(stripCell);
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i]) && !isTableSep(lines[i])) {
        rows.push(tableCells(lines[i]).map(stripCell));
        i++;
      }
      sections.push(buildTableSection(header, rows));
    } else {
      buf.push(lines[i]);
      i++;
    }
  }
  flushText();
  return sections;
}

const spokenOf = (s: Section) => (s.kind === "text" ? s.text : s.spoken);

// Split a string into words, keeping each word's character offset.
interface WordToken { w: string; start: number }

function wordsOf(p: string): WordToken[] {
  const out: WordToken[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(p)) !== null) out.push({ w: m[0], start: m.index });
  return out;
}

// A chunk is a short slice of a section's spoken text, spoken as one utterance.
interface Chunk { sectionIdx: number; text: string; offset: number }

function buildChunks(sections: Section[]): Chunk[] {
  const chunks: Chunk[] = [];
  sections.forEach((sec, sectionIdx) => {
    const text = spokenOf(sec);
    const words = wordsOf(text);
    if (words.length === 0) return;
    let startWord = 0;
    for (let i = 0; i < words.length; i++) {
      const chunkStart = words[startWord].start;
      const wordEnd = words[i].start + words[i].w.length;
      const len = wordEnd - chunkStart;
      // Include Indic sentence terminators (। danda, ॥ double danda) so
      // Gujarati/Hindi paragraphs chunk at sentence boundaries instead of
      // hitting MAX_CHUNK mid-phrase.
      const endsSentence = /[.!?:;।॥]["')\]]?$/.test(words[i].w);
      const atLast = i === words.length - 1;
      if (atLast || len >= MAX_CHUNK || (endsSentence && len >= MIN_CHUNK)) {
        chunks.push({ sectionIdx, text: text.slice(chunkStart, wordEnd), offset: chunkStart });
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
        <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-[3px] h-8">
      {BAR_HEIGHTS.map((h, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-emerald-500"
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
  const sections = useRef<Section[]>(parseSections(text));
  const total = sections.current.length;
  const useSegmented = total <= 20;

  // Per-text-section word tokens (karaoke) + flat list of speech chunks.
  const wordsBySection = useRef<WordToken[][]>(
    sections.current.map((s) => (s.kind === "text" ? wordsOf(s.text) : []))
  );
  const chunks = useRef<Chunk[]>(buildChunks(sections.current));

  // Render state
  const [status, setStatus]   = useState<Status>("loading");
  const [sec, setSec]         = useState(0);   // active section index
  const [speed, setSpeed]     = useState<Speed>(1);
  const [charIdx, setCharIdx] = useState(-1);  // section-relative char offset spoken

  // Refs — always up-to-date inside callbacks (avoids stale closures)
  const statusRef = useRef<Status>("loading");
  const secRef    = useRef(0);
  const speedRef  = useRef<Speed>(1);
  const chunkRef  = useRef(0);

  // Word-timing estimator state
  const estimatorRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentChunkRef = useRef<Chunk | null>(null);
  const anchorCharRef   = useRef(0);
  const anchorTimeRef   = useRef(0);
  const speakStartRef   = useRef(0);
  const charsPerSecRef  = useRef(DEFAULT_CHARS_PER_SEC);

  // Transcript scroll container + active-section element
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const activeSecRef  = useRef<HTMLDivElement | null>(null);

  // ── Helpers to update both state + ref atomically ──────────────────────────
  const updStatus = useCallback((s: Status) => {
    statusRef.current = s;
    setStatus(s);
    onPlayingChange?.(s === "playing");
  }, [onPlayingChange]);

  const updSec = useCallback((s: number) => {
    secRef.current = s;
    setSec(s);
    setCharIdx(-1);
  }, []);

  const updSpeed = useCallback((s: Speed) => {
    speedRef.current = s;
    setSpeed(s);
  }, []);

  // ── First chunk index belonging to a given section ─────────────────────────
  const firstChunkOfSection = useCallback((sectionIdx: number) => {
    const idx = chunks.current.findIndex((c) => c.sectionIdx >= sectionIdx);
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
      updStatus("idle");
      return;
    }
    let stopped = false;
    let attempts = 0;
    function tryLoad() {
      if (stopped) return;
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0 || attempts >= 10) updStatus("idle");
      else { attempts++; setTimeout(tryLoad, 200); }
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

  // ── Keep the active section centred in the transcript panel ────────────────
  useEffect(() => {
    const el = activeSecRef.current;
    const container = transcriptRef.current;
    if (!el || !container) return;
    const elRect = el.getBoundingClientRect();
    const cRect = container.getBoundingClientRect();
    const target =
      container.scrollTop + (elRect.top - cRect.top)
      - container.clientHeight / 2 + el.clientHeight / 2;
    const max = container.scrollHeight - container.clientHeight;
    container.scrollTo({ top: Math.max(0, Math.min(target, max)), behavior: "smooth" });
  }, [sec]);

  // ── Core speak function — speaks one chunk, then chains to the next ────────
  const speak = useCallback(
    (chunkIndex: number, rate: number, immediate: boolean) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;

      if (chunkIndex >= chunks.current.length) {
        stopEstimator();
        updStatus("idle");
        updSec(0);
        chunkRef.current = 0;
        return;
      }

      const doSpeak = () => {
        if (statusRef.current === "paused" || statusRef.current === "idle") return;

        const chunk = chunks.current[chunkIndex];
        currentChunkRef.current = chunk;
        const utt = new SpeechSynthesisUtterance(chunk.text);
        utt.rate  = rate;
        utt.pitch = 1;

        // Pick voice + lang based on the script of *this* chunk so mixed-
        // language lessons (e.g. Gujarati paragraph followed by an English
        // code sample) read each part correctly.
        const lang = detectLang(chunk.text);
        const voices = window.speechSynthesis.getVoices();
        const preferred = pickVoice(voices, lang);
        if (preferred) utt.voice = preferred;
        utt.lang = preferred?.lang || lang;

        utt.onstart = () => {
          chunkRef.current = chunkIndex;
          if (secRef.current !== chunk.sectionIdx) updSec(chunk.sectionIdx);
          anchorCharRef.current = 0;
          anchorTimeRef.current = performance.now();
          speakStartRef.current = anchorTimeRef.current;
          setCharIdx(chunk.offset);
          updStatus("playing");
          startEstimator();
        };

        utt.onboundary = (e) => {
          if (e.name === "word" || e.name === undefined) {
            anchorCharRef.current = e.charIndex;
            anchorTimeRef.current = performance.now();
            setCharIdx(chunk.offset + e.charIndex);
          }
        };

        utt.onend = () => {
          stopEstimator();
          const dur = (performance.now() - speakStartRef.current) / 1000;
          if (dur > 0.4) {
            const measured = chunk.text.length / dur / rate;
            charsPerSecRef.current = charsPerSecRef.current * 0.4 + measured * 0.6;
          }
          if (statusRef.current === "playing") {
            speak(chunkIndex + 1, speedRef.current, true);
          }
        };

        utt.onerror = (e) => {
          if (e.error !== "interrupted" && e.error !== "canceled") {
            stopEstimator();
            updStatus("idle");
          }
        };

        window.speechSynthesis.speak(utt);
      };

      if (immediate) {
        setTimeout(doSpeak, 0);
      } else {
        window.speechSynthesis.cancel();
        setTimeout(doSpeak, 60);
      }
    },
    [updStatus, updSec, startEstimator, stopEstimator]
  );

  // ── Controls ───────────────────────────────────────────────────────────────

  function handlePlay() {
    if (statusRef.current === "loading" || total === 0) return;
    const startChunk = statusRef.current === "idle" ? 0 : chunkRef.current;
    updStatus("playing");
    speak(startChunk, speedRef.current, false);
  }

  function handlePause() {
    if (statusRef.current !== "playing") return;
    window.speechSynthesis.cancel();
    stopEstimator();
    updStatus("paused");
  }

  function handleStop() {
    window.speechSynthesis.cancel();
    stopEstimator();
    updStatus("idle");
    updSec(0);
    chunkRef.current = 0;
  }

  function jumpToSection(target: number) {
    const clamped = Math.max(0, Math.min(total - 1, target));
    const chunkIndex = firstChunkOfSection(clamped);
    chunkRef.current = chunkIndex;
    if (statusRef.current === "playing" || statusRef.current === "paused") {
      updStatus("playing");
      speak(chunkIndex, speedRef.current, false);
    } else {
      updSec(clamped);
    }
  }

  function handlePrev() { jumpToSection(secRef.current - 1); }
  function handleNext() { jumpToSection(secRef.current + 1); }

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
  const progress  = total > 0 ? Math.round(((sec + (isPlaying ? 0.5 : 0)) / total) * 100) : 0;

  // Word being spoken (text section).
  const curWordIdx = useMemo(() => {
    if (charIdx < 0) return -1;
    const words = wordsBySection.current[sec] ?? [];
    let idx = -1;
    for (let i = 0; i < words.length; i++) {
      if (words[i].start <= charIdx) idx = i;
      else break;
    }
    return idx;
  }, [charIdx, sec]);

  // Row being read (table section).
  const activeRow = useMemo(() => {
    const s = sections.current[sec];
    if (!s || s.kind !== "table" || charIdx < 0) return -1;
    let idx = -1;
    for (let i = 0; i < s.rowSpans.length; i++) {
      if (s.rowSpans[i].start <= charIdx) idx = i;
      else break;
    }
    return idx;
  }, [charIdx, sec]);

  const statusLabel = isLoading
    ? "Loading voices…"
    : isPlaying
    ? `Reading section ${sec + 1} of ${total}`
    : status === "paused"
    ? `Paused · section ${sec + 1} of ${total}`
    : sec === 0
    ? `${total} section${total !== 1 ? "s" : ""} · tap ▶ to start`
    : `Stopped · ${progress}% read`;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 340, damping: 26 }}
      className="w-full overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="p-3.5 sm:p-5">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center flex-shrink-0">
              <Headphones className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-foreground text-sm font-semibold leading-tight">Read Along</p>
              <p className="text-emerald-600/80 dark:text-emerald-400/70 text-[11px] truncate">
                {lessonTitle || "Listen & follow the text"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-0.5 p-0.5 rounded-lg bg-muted border border-border">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={cn(
                    "px-2 py-1 text-[11px] font-semibold rounded-md transition-all",
                    speed === s
                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s}×
                </button>
              ))}
            </div>

            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg bg-muted hover:bg-border text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors flex-shrink-0"
              aria-label="Close audio player"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Waveform + controls row */}
        <div className="flex items-center gap-3 sm:gap-4 mb-4">
          <div className="flex-shrink-0 hidden sm:block">
            <Waveform playing={isPlaying} loading={isLoading} />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button
              onClick={handlePrev}
              disabled={sec === 0 || isLoading}
              className="w-9 h-9 rounded-lg bg-muted hover:bg-border border border-border text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Previous section"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <motion.button
              onClick={isPlaying ? handlePause : handlePlay}
              disabled={isLoading}
              whileTap={{ scale: 0.92 }}
              className={cn(
                "relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-colors overflow-hidden",
                "bg-emerald-500 hover:bg-emerald-600 text-white",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying && (
                <motion.div
                  className="absolute inset-0 rounded-xl border-2 border-emerald-300"
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

            <button
              onClick={handleNext}
              disabled={sec >= total - 1 || isLoading}
              className="w-9 h-9 rounded-lg bg-muted hover:bg-border border border-border text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Next section"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <AnimatePresence initial={false}>
              {(isPlaying || status === "paused") && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  onClick={handleStop}
                  className="w-9 h-9 rounded-lg bg-muted hover:bg-red-500/15 border border-border hover:border-red-500/30 text-muted-foreground hover:text-red-500 flex items-center justify-center transition-colors flex-shrink-0"
                  title="Stop"
                >
                  <Square className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-end flex-1 min-w-0">
            <div className="flex sm:hidden items-center gap-0.5 p-0.5 rounded-lg bg-muted border border-border">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={cn(
                    "px-1.5 py-1 text-[10px] font-semibold rounded-md transition-all",
                    speed === s
                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                      : "text-muted-foreground"
                  )}
                >
                  {s}×
                </button>
              ))}
            </div>
            <Volume2 className="w-4 h-4 text-emerald-600/50 dark:text-emerald-400/50 flex-shrink-0 hidden sm:block" />
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          {useSegmented ? (
            <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
              {sections.current.map((_, i) => (
                <motion.button
                  key={i}
                  onClick={() => jumpToSection(i)}
                  className={cn(
                    "flex-1 h-full rounded-full transition-colors cursor-pointer",
                    i < sec ? "bg-emerald-500" : i === sec ? "bg-emerald-400" : "bg-muted hover:bg-border"
                  )}
                  animate={i === sec && isPlaying ? { opacity: [0.7, 1, 0.7] } : {}}
                  transition={{ duration: 1.4, repeat: Infinity }}
                />
              ))}
            </div>
          ) : (
            <div
              className="relative h-2 rounded-full bg-muted overflow-hidden group cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const target = Math.floor(((e.clientX - rect.left) / rect.width) * total);
                jumpToSection(target);
              }}
            >
              <div
                className="absolute inset-y-0 left-0 bg-emerald-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
              {Array.from({ length: Math.min(total - 1, 40) }, (_, i) => {
                const tickCount = Math.min(total - 1, 40);
                const pct = ((i + 1) / (tickCount + 1)) * 100;
                return (
                  <div key={i} className="absolute top-0 bottom-0 w-px bg-border" style={{ left: `${pct}%` }} />
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground text-[10px] truncate">{statusLabel}</span>
            <span className="text-emerald-600 dark:text-emerald-400/60 text-[10px] font-semibold flex-shrink-0">{progress}%</span>
          </div>
        </div>

        {/* ── Synced read-along transcript ─────────────────────────────────── */}
        {total > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-2 font-medium flex items-center gap-1.5">
              <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", isPlaying ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40")} />
              Transcript · tap any line to jump
            </p>
            <div
              ref={transcriptRef}
              className="max-h-[180px] sm:max-h-[280px] overflow-y-auto pr-1 sm:pr-1.5 space-y-1 select-none scroll-smooth overscroll-contain"
            >
              {sections.current.map((s, i) => {
                const isActive = i === sec;
                return (
                  <div
                    key={i}
                    ref={isActive ? activeSecRef : undefined}
                    role="button"
                    tabIndex={0}
                    onClick={() => jumpToSection(i)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); jumpToSection(i); }
                    }}
                    className={cn(
                      "w-full text-left rounded-lg px-2.5 sm:px-3 py-2 transition-colors cursor-pointer",
                      isActive ? "bg-emerald-500/10 ring-1 ring-emerald-500/30" : "hover:bg-muted"
                    )}
                  >
                    {s.kind === "table" ? (
                      <TableView section={s} active={isActive} activeRow={isActive ? activeRow : -1} />
                    ) : (
                      <span
                        className={cn(
                          "text-[12px] sm:text-[13px] leading-relaxed break-words",
                          isActive
                            ? "text-foreground"
                            : i < sec
                            ? "text-muted-foreground/60"
                            : "text-muted-foreground"
                        )}
                      >
                        {isActive ? (
                          <ActiveParagraph words={wordsBySection.current[i]} curWordIdx={curWordIdx} />
                        ) : (
                          s.text
                        )}
                      </span>
                    )}
                  </div>
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
                ? "rounded bg-emerald-500/25 text-emerald-700 dark:text-emerald-200 font-semibold px-0.5"
                : isPast
                ? "text-emerald-600/80 dark:text-emerald-400/70"
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

// ─── Table section — rendered as a real table, active row highlighted ─────────

function TableView({
  section, active, activeRow,
}: { section: TableSection; active: boolean; activeRow: number }) {
  return (
    <div className="overflow-x-auto -mx-0.5">
      <table className="w-full border-collapse text-[11px] sm:text-[12.5px]">
        {section.header.some(Boolean) && (
          <thead>
            <tr>
              {section.header.map((h, i) => (
                <th
                  key={i}
                  className="border border-border bg-muted px-2 py-1.5 text-left font-semibold text-foreground whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {section.rows.map((row, ri) => {
            const rowActive = active && ri === activeRow;
            return (
              <tr key={ri} className={cn("transition-colors", rowActive && "bg-emerald-500/15")}>
                {row.map((c, ci) => (
                  <td
                    key={ci}
                    className={cn(
                      "border border-border px-2 py-1.5 align-top break-words",
                      rowActive
                        ? "text-foreground font-medium"
                        : active
                        ? "text-foreground/80"
                        : "text-muted-foreground"
                    )}
                  >
                    {c}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
