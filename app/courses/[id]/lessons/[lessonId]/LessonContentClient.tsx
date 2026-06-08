"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Lock, PlayCircle, FileText, HelpCircle,
  ChevronLeft, ChevronRight, Clock, Sparkles, Eye,
  Download, Headphones, ArrowLeft, BookOpen, Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { gujaratiFontClass } from "@/lib/gujarati-font";
import QuizPlayer from "@/components/QuizPlayer";
import LessonWhiteboard from "@/components/whiteboard/LessonWhiteboard";
import TextHighlighter from "@/components/TextHighlighter";
import LessonAudioPlayer from "@/components/LessonAudioPlayer";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import VideoLessonPlayer from "@/components/VideoLessonPlayer";
import ShareCourseModal from "@/components/ShareCourseModal";
import CourseCompletionConfetti from "@/components/CourseCompletionConfetti";
import { Tooltip } from "@/components/ui/Tooltip";
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
  const { isEnrolled, loading, completedCount, isCompleted, markComplete } = useLessonContext();
  const [showAudioPlayer,  setShowAudioPlayer]  = useState(false);
  const [isAudioPlaying,   setIsAudioPlaying]   = useState(false);
  const [downloadingCert,  setDownloadingCert]  = useState(false);
  const [showConfetti,     setShowConfetti]     = useState(false);

  const config   = typeConfig[lesson.type] ?? typeConfig.TEXT;
  const TypeIcon = config.icon;
  const done     = isCompleted(lesson.id);
  const isLocked = !loading && !lesson.isFree && !isEnrolled;

  // Show certificate banner once ≥90% of the course is complete
  const progressPct     = totalLessons > 0 ? completedCount / totalLessons : 0;
  const eligibleForCert = !loading && isEnrolled && progressPct >= 0.9;
  const courseFinished  = progressPct >= 1;

  // ── Confetti: fire only when courseFinished transitions false→true post-load ─
  const initialLoadDone   = useRef(false);
  const prevFinished      = useRef(false);
  useEffect(() => {
    if (loading) return;
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      prevFinished.current    = courseFinished;
      return;
    }
    if (courseFinished && !prevFinished.current) setShowConfetti(true);
    prevFinished.current = courseFinished;
  }, [courseFinished, loading]);

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
    lessonId:         lesson.id,
    isEnrolled:       isEnrolled && lesson.type === "TEXT",
    alreadyCompleted: done,
    onComplete:       handleAutoComplete,
  });

  // Combined reading progress percentage (average of scroll + time progress)
  const scrollProgress  = Math.min(100, Math.round((scrollPct  / SCROLL_THRESHOLD) * 100));
  const timeProgress    = Math.min(100, Math.round((activeSecs / TIME_THRESHOLD)   * 100));
  const combinedPct     = Math.round((scrollProgress + timeProgress) / 2);

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

      {/* ── Course completion confetti overlay ───────────────────────────── */}
      <CourseCompletionConfetti show={showConfetti} onDone={() => setShowConfetti(false)} />

      {/* ── Certificate download alert (compact, theme-aware) ───────────── */}
      <AnimatePresence>
        {eligibleForCert && (
          <motion.div
            key="cert-achievement"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            role="alert"
            className="mb-4 sm:mb-5 relative overflow-hidden rounded-lg border border-amber-300/70 bg-amber-50/80 dark:border-amber-400/25 dark:bg-amber-500/[0.06]"
          >
            {/* Slow shimmer sweep — visible in both themes */}
            <motion.div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent dark:via-amber-300/[0.06]"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear", repeatDelay: 3 }}
            />

            <div className="relative px-3 py-2.5 sm:px-4 sm:py-3 flex items-center gap-3">
              {/* Trophy chip */}
              <div className="flex-shrink-0 w-9 h-9 rounded-md flex items-center justify-center bg-amber-100 border border-amber-300/80 dark:bg-amber-500/15 dark:border-amber-400/25">
                <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 leading-tight">
                  <p className="text-[13px] sm:text-sm font-semibold text-amber-900 dark:text-amber-100 truncate">
                    {courseFinished ? "Course mastered!" : "Certificate unlocked"}
                  </p>
                  <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700/90 dark:text-amber-400/90">
                    <Sparkles className="w-2.5 h-2.5" />
                    {courseFinished ? "100%" : `${Math.round(progressPct * 100)}%`}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-amber-800/80 dark:text-amber-200/60 leading-snug truncate">
                  {courseFinished
                    ? "Every lesson complete — your credential is ready."
                    : "You've passed the threshold. Download your certificate."}
                </p>
              </div>

              {/* Download button */}
              <button
                onClick={downloadCertificate}
                disabled={downloadingCert}
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all disabled:opacity-60 bg-amber-500 hover:bg-amber-600 text-white shadow-sm dark:bg-amber-500/15 dark:hover:bg-amber-500/25 dark:text-amber-300 dark:border dark:border-amber-400/30 group"
                aria-label={downloadingCert ? "Generating certificate" : "Download certificate"}
              >
                {downloadingCert ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white dark:border-amber-400/30 dark:border-t-amber-400 rounded-full animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
                )}
                <span className="hidden sm:inline whitespace-nowrap">
                  {downloadingCert ? "Generating…" : "Download"}
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <Tooltip label={showAudioPlayer ? "Hide audio player" : "Listen to this lesson"}>
                <button
                  aria-label={showAudioPlayer ? "Hide audio player" : "Listen to this lesson"}
                  onClick={() => setShowAudioPlayer((v) => !v)}
                  className={cn(
                    "relative w-9 h-9 flex items-center justify-center rounded-md border transition-colors",
                    showAudioPlayer
                      ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-400"
                      : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:bg-secondary",
                  )}
                >
                  <Headphones className="w-4 h-4" />
                  {isAudioPlaying && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>
              </Tooltip>
            )}

            {/* Share lesson link */}
            <ShareCourseModal
              path={`/courses/${courseId}/lessons/${lesson.id}`}
              title={lesson.title}
              iconOnly
              tooltip="Share this lesson"
            />

            {/* Status / progress hint — right-aligned */}
            <div className="ml-auto flex items-center gap-2">
              {done ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/15 px-3 py-1.5 rounded-md border border-emerald-400/20">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                </span>
              ) : lesson.type === "TEXT" ? (
                <span className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-secondary border border-border/60 text-[11px]">
                  <BookOpen className="w-3 h-3 text-[#d97757]/80 flex-shrink-0" />
                  <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500",
                        combinedPct >= 100 ? "bg-green-500" : "bg-gradient-to-r from-[#d97757] to-orange-400"
                      )}
                      style={{ width: `${combinedPct}%` }}
                    />
                  </div>
                  <span className={cn("font-bold tabular-nums", combinedPct >= 100 ? "text-green-400" : "text-foreground/70")}>
                    {combinedPct}%
                  </span>
                </span>
              ) : null}
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
            lessonId={lesson.id}
            alreadyCompleted={done}
            onComplete={handleAutoComplete}
            onManualComplete={isEnrolled ? handleAutoComplete : undefined}
          />

        ) : lesson.content ? (
          // TEXT: markdown content — scroll + time tracked by useReadingProgress
          <div
            className={cn("px-3 sm:px-6 lg:px-8 py-5 sm:py-8 overflow-x-hidden select-none", gujaratiFontClass(lesson.content))}
            onCopy={(e) => {
              e.preventDefault();
              toast("🔒 Content is protected. Use the highlight feature to save passages.", { duration: 3000 });
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <TextHighlighter lessonId={lesson.id} isEnrolled={isEnrolled}>
              <MarkdownRenderer content={lesson.content} />
            </TextHighlighter>

            {/* Reading progress footer — progress bar only */}
            {isEnrolled && !done && (
              <div className="mt-8 pt-5 border-t border-border/40">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#d97757]" />
                    <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">Lesson Progress</span>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 text-sm font-bold tabular-nums transition-colors duration-500",
                    combinedPct >= 100 ? "text-green-400" : "text-[#d97757]"
                  )}>
                    {combinedPct >= 100 && <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>{combinedPct}%</span>
                  </div>
                </div>
                <div className="relative h-2.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700 ease-out",
                      combinedPct >= 100 ? "bg-green-500" : "bg-gradient-to-r from-[#d97757] to-orange-400"
                    )}
                    style={{ width: `${combinedPct}%` }}
                  />
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

      {/* ── Lesson whiteboard (enrolled learners) ────────────────────────── */}
      {isEnrolled && <LessonWhiteboard lessonId={lesson.id} />}

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
