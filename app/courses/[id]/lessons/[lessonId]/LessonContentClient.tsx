"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Lock, PlayCircle, FileText, HelpCircle,
  ChevronLeft, ChevronRight, Clock, Sparkles, Eye,
  Award, Download, Headphones, ArrowLeft, BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import QuizPlayer from "@/components/QuizPlayer";
import TextHighlighter from "@/components/TextHighlighter";
import LessonAudioPlayer from "@/components/LessonAudioPlayer";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import VideoLessonPlayer from "@/components/VideoLessonPlayer";
import { useReadingProgress, SCROLL_THRESHOLD, TIME_THRESHOLD } from "@/hooks/useReadingProgress";
import { useLessonContext } from "../LessonProvider";
import toast from "react-hot-toast";

interface LessonData {
  id:        string;
  title:     string;
  type:      "TEXT" | "VIDEO" | "QUIZ";
  content?:  string | null;
  duration?: number | null;
  isFree?:   boolean;
  section?:  { id: string; title: string; order: number } | null;
}

interface NavItem { id: string; title: string }

interface Props {
  courseId:      string;
  lesson:        LessonData;
  lessonIndex:   number;
  totalLessons:  number;
  chapterTitle?:  string;
  chapterIndex?:  number;
  totalChapters?: number;
  prev:          NavItem | null;
  next:          NavItem | null;
}

const typeConfig = {
  VIDEO: { icon: PlayCircle, color: "text-[#d97757]", bg: "bg-orange-500/15", border: "border-[#d97757]/20", label: "Video" },
  TEXT:  { icon: FileText,   color: "text-blue-400",   bg: "bg-blue-500/15",   border: "border-blue-400/20",   label: "Reading" },
  QUIZ:  { icon: HelpCircle, color: "text-amber-400",  bg: "bg-amber-500/15",  border: "border-amber-400/20",  label: "Quiz" },
};

export default function LessonContentClient({ courseId, lesson, lessonIndex, totalLessons, chapterTitle, chapterIndex, totalChapters, prev, next }: Props) {
  const router = useRouter();
  const { isEnrolled, loading, isCompleted, markComplete } = useLessonContext();
  const [showAudioPlayer,  setShowAudioPlayer]  = useState(false);
  const [isAudioPlaying,   setIsAudioPlaying]   = useState(false);
  const [downloadingCert,  setDownloadingCert]  = useState(false);

  const config   = typeConfig[lesson.type] ?? typeConfig.TEXT;
  const TypeIcon = config.icon;
  const done     = isCompleted(lesson.id);
  const isLocked = !loading && !lesson.isFree && !isEnrolled;
  const allComplete = !loading && isEnrolled && !next && done;

  // ── Keyboard navigation ──────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft"  && prev) router.push(`/courses/${courseId}/lessons/${prev.id}`);
      if (e.key === "ArrowRight" && next) router.push(`/courses/${courseId}/lessons/${next.id}`);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, courseId, router]);

  // ── Auto-complete callback (used by video + reading trackers) ────────────
  const handleAutoComplete = useCallback(() => {
    if (!isEnrolled || done) return;
    markComplete(lesson.id, true);
  }, [isEnrolled, done, lesson.id, markComplete]);

  // ── Certificate download ─────────────────────────────────────────────────
  async function downloadCertificate() {
    if (downloadingCert) return;
    setDownloadingCert(true);
    try {
      const res = await fetch(`/api/certificates/${courseId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to generate certificate");
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `certificate-${courseId}.pdf`; a.click();
      URL.revokeObjectURL(url);
      toast.success("Certificate downloaded!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingCert(false);
    }
  }

  // ── Reading progress (TEXT lessons only) ─────────────────────────────────
  const { scrollPct, activeSecs, scrollDone, timeDone } = useReadingProgress({
    isEnrolled:       isEnrolled && lesson.type === "TEXT",
    alreadyCompleted: done,
    onComplete:       handleAutoComplete,
  });

  // ── Locked state ─────────────────────────────────────────────────────────
  if (isLocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-20 text-center">
        <div className="w-20 h-20 rounded-md bg-secondary border border-border flex items-center justify-center mb-6">
          <Lock className="w-10 h-10 text-muted-foreground/25" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">Enroll to Access</h2>
        <p className="text-muted-foreground/70 max-w-sm leading-relaxed mb-6">
          This lesson is part of a paid course. Enroll to unlock all {totalLessons} lessons.
        </p>
        <Link
          href={`/courses/${courseId}`}
          className="btn-primary px-6 py-3 font-semibold"
        >
          View Course &amp; Enroll
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto px-0 sm:px-4 lg:px-6 py-4 sm:py-8 lg:py-10">

      {/* ── Lesson header ────────────────────────────────────────────────── */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-start gap-2.5 sm:gap-3 mb-3">
          <div className={cn("w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center border flex-shrink-0 mt-0.5", config.bg, config.border)}>
            <TypeIcon className={cn("w-4 h-4 sm:w-5 sm:h-5", config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            {/* Chapter breadcrumb */}
            {chapterTitle && (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 font-medium mb-1.5">
                <BookOpen className="w-3 h-3 flex-shrink-0" />
                <span>
                  {totalChapters && chapterIndex
                    ? `Chapter ${chapterIndex} of ${totalChapters}`
                    : `Chapter ${chapterIndex ?? ""}`}
                </span>
                <span className="text-muted-foreground/25">·</span>
                <span className="text-[#d97757]/70 truncate">{chapterTitle}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1">
              <span className="text-[10px] sm:text-[11px] text-muted-foreground/60 font-medium uppercase tracking-wide">
                Lesson {lessonIndex + 1} of {totalLessons}
              </span>
              <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full border", config.color, config.bg, config.border)}>
                {config.label}
              </span>
              {lesson.isFree && !isEnrolled && !loading && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-full border border-emerald-400/20 font-medium">
                  <Eye className="w-2.5 h-2.5" /> Free Preview
                </span>
              )}
              {lesson.duration && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                  <Clock className="w-3 h-3" />
                  {lesson.duration} min
                </span>
              )}
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-foreground leading-snug">{lesson.title}</h1>
          </div>
        </div>

        {/* Action bar — enrolled only, hidden for QUIZ */}
        {isEnrolled && lesson.type !== "QUIZ" && (
          <div className="flex items-center gap-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border">
            {lesson.type === "TEXT" && lesson.content && (
              <button
                onClick={() => setShowAudioPlayer((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 text-xs px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md border transition-all font-medium",
                  showAudioPlayer
                    ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-400"
                    : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {isAudioPlaying && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                )}
                <Headphones className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{showAudioPlayer ? "Audio Mode" : "Listen"}</span>
              </button>
            )}

            {/* Status / progress hint — right-aligned */}
            <div className="ml-auto flex items-center gap-2">
              {done ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/15 px-3 py-1.5 rounded-md border border-emerald-400/20">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                </span>
              ) : lesson.type === "TEXT" ? (
                <span className="hidden sm:flex items-center gap-3 text-[11px] text-muted-foreground/50">
                  <span className={cn("flex items-center gap-1", scrollDone && "text-green-400/70")}>
                    <Eye className="w-3 h-3" /> {scrollPct}% read
                  </span>
                  <span className={cn("flex items-center gap-1", timeDone && "text-green-400/70")}>
                    <Clock className="w-3 h-3" /> {activeSecs}s / {TIME_THRESHOLD}s
                  </span>
                </span>
              ) : (
                <span className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground/50">
                  <Eye className="w-3 h-3" /> Auto-completes at 80% watched
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Audio player ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAudioPlayer && lesson.type === "TEXT" && lesson.content && (
          <motion.div
            key="audio"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.18 }}
            className="mb-4 sm:mb-6"
          >
            <LessonAudioPlayer
              text={lesson.content}
              lessonTitle={lesson.title}
              onClose={() => { setShowAudioPlayer(false); setIsAudioPlaying(false); }}
              onPlayingChange={setIsAudioPlaying}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Content body ─────────────────────────────────────────────────── */}
      <div className="rounded-md border border-border overflow-hidden">

        {lesson.type === "QUIZ" ? (
          <div className="p-4 sm:p-6">
            <QuizLoader
              lessonId={lesson.id}
              onComplete={() => { if (!done) markComplete(lesson.id, true); }}
            />
          </div>

        ) : lesson.type === "VIDEO" && lesson.content ? (
          // VIDEO: smart player with segment tracking + auto-complete at 80%
          <VideoLessonPlayer
            url={lesson.content}
            alreadyCompleted={done}
            onComplete={handleAutoComplete}
          />

        ) : lesson.content ? (
          // TEXT: markdown content — scroll + time tracked by useReadingProgress
          <div className="px-3 sm:px-6 lg:px-8 py-5 sm:py-8 overflow-x-hidden">
            <TextHighlighter lessonId={lesson.id} isEnrolled={isEnrolled}>
              <MarkdownRenderer content={lesson.content} />
            </TextHighlighter>

            {/* Reading progress footer (mobile-friendly, shown before completion) */}
            {isEnrolled && !done && (
              <div className="mt-6 pt-4 border-t border-border/40 flex flex-col sm:flex-row gap-3 text-xs text-muted-foreground/60">
                <div className="flex items-center gap-2 flex-1">
                  <Eye className="w-3.5 h-3.5 flex-shrink-0" />
                  <div className="flex-1 bg-secondary rounded-full h-1.5 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", scrollDone ? "bg-green-500" : "bg-[#d97757]")}
                      style={{ width: `${scrollPct}%` }}
                    />
                  </div>
                  <span className="whitespace-nowrap">
                    {scrollDone ? "✓" : `${scrollPct}%`} scrolled
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  <div className="flex-1 bg-secondary rounded-full h-1.5 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", timeDone ? "bg-green-500" : "bg-[#d97757]")}
                      style={{ width: `${Math.min(100, (activeSecs / TIME_THRESHOLD) * 100)}%` }}
                    />
                  </div>
                  <span className="whitespace-nowrap">
                    {timeDone ? "✓" : `${activeSecs}s`} / {TIME_THRESHOLD}s reading
                  </span>
                </div>
              </div>
            )}
          </div>

        ) : (
          <div className="flex flex-col items-center justify-center py-16 sm:py-20 px-6 text-center">
            <FileText className="w-12 h-12 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground/60">No content added yet.</p>
          </div>
        )}
      </div>

      {/* ── Prev / Next navigation ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 mt-5 sm:mt-8 pt-4 sm:pt-6 border-t border-border">
        {prev ? (
          <Link
            href={`/courses/${courseId}/lessons/${prev.id}`}
            className="flex items-center gap-2.5 sm:gap-3 text-muted-foreground hover:text-foreground transition-all group px-3 sm:px-4 py-2.5 sm:py-3 rounded-md hover:bg-secondary border border-border/50 hover:border-border"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </div>
            <div className="text-left min-w-0 flex-1">
              <p className="text-[10px] text-muted-foreground/50 mb-0.5 font-medium uppercase tracking-wide">Previous</p>
              <p className="text-sm font-semibold truncate">{prev.title}</p>
            </div>
          </Link>
        ) : (
          <Link
            href={`/courses/${courseId}`}
            className="flex items-center gap-2.5 sm:gap-3 text-muted-foreground hover:text-foreground transition-all group px-3 sm:px-4 py-2.5 sm:py-3 rounded-md hover:bg-secondary border border-border/50 hover:border-border"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </div>
            <div className="text-left">
              <p className="text-[10px] text-muted-foreground/50 mb-0.5 font-medium uppercase tracking-wide">Back to</p>
              <p className="text-sm font-semibold">Course Overview</p>
            </div>
          </Link>
        )}

        {next ? (
          <Link
            href={`/courses/${courseId}/lessons/${next.id}`}
            className="flex items-center justify-end gap-2.5 sm:gap-3 group bg-gradient-to-r from-orange-600/15 to-orange-500/15 border border-[#d97757]/20 text-primary hover:text-foreground px-3 sm:px-4 py-2.5 sm:py-3 rounded-md transition-all hover:from-orange-600/25 hover:to-orange-500/20"
          >
            <div className="text-right min-w-0 flex-1">
              <p className="text-[10px] text-muted-foreground/50 mb-0.5 font-medium uppercase tracking-wide">Next</p>
              <p className="text-sm font-semibold truncate">{next.title}</p>
            </div>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-orange-500/15 flex items-center justify-center flex-shrink-0">
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        ) : (
          <div className="flex items-center justify-center gap-2 text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-400/20 px-4 py-2.5 sm:py-3 rounded-md text-sm">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            You&apos;ve reached the end!
          </div>
        )}
      </div>

      {/* ── Certificate banner ────────────────────────────────────────────── */}
      {allComplete && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="mt-4 sm:mt-6 p-4 sm:p-5 rounded-md bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-amber-400/20 relative overflow-hidden"
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
          <div className="relative flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-md bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Award className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-foreground font-bold text-sm">Course Completed!</h3>
              <p className="text-muted-foreground/70 text-xs mt-0.5 hidden sm:block">All lessons done. Claim your certificate!</p>
              <p className="text-muted-foreground/70 text-xs mt-0.5 sm:hidden">Claim your certificate!</p>
            </div>
            <button
              onClick={downloadCertificate}
              disabled={downloadingCert}
              className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold px-3 sm:px-5 py-2 sm:py-2.5 rounded-md text-xs sm:text-sm hover:from-amber-400 hover:to-yellow-400 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex-shrink-0"
            >
              {downloadingCert
                ? <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                : <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              <span className="hidden sm:inline">{downloadingCert ? "Generating…" : "Get Certificate"}</span>
              <span className="sm:hidden">{downloadingCert ? "…" : "Certificate"}</span>
            </button>
          </div>
        </motion.div>
      )}

      <p className="text-muted-foreground/30 text-[10px] text-center mt-6 hidden lg:block">
        Use ← → arrow keys to navigate between lessons
      </p>
    </div>
  );
}

// ── Quiz loader ───────────────────────────────────────────────────────────────

function QuizLoader({ lessonId, onComplete }: { lessonId: string; onComplete: () => void }) {
  const [quiz,    setQuiz]    = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    setLoading(true); setError(null); setQuiz(null);
    fetch(`/api/lessons/${lessonId}/quiz`)
      .then((r) => (r.ok ? r.json() : r.json().then((d) => Promise.reject(d.error))))
      .then(setQuiz)
      .catch((e) => setError(typeof e === "string" ? e : "Failed to load quiz"))
      .finally(() => setLoading(false));
  }, [lessonId]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-[#d97757]/25 border-t-[#d97757] rounded-full animate-spin" />
    </div>
  );
  if (error || !quiz) return (
    <div className="text-center py-16">
      <HelpCircle className="w-12 h-12 text-muted-foreground/25 mx-auto mb-4" />
      <p className="text-muted-foreground/60">{error || "No quiz available."}</p>
    </div>
  );
  return (
    <QuizPlayer
      quiz={quiz as Parameters<typeof QuizPlayer>[0]["quiz"]}
      onComplete={(_score, passed) => { if (passed) onComplete(); }}
    />
  );
}
