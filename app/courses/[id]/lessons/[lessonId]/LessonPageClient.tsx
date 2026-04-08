"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Circle, Lock, PlayCircle, FileText, HelpCircle,
  ChevronLeft, ChevronRight, ChevronDown, Clock, Sparkles,
  Eye, LayoutList, Copy, Check, Code2, Hash,
  Award, Download, Headphones, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import QuizPlayer from "@/components/QuizPlayer";
import TextHighlighter from "@/components/TextHighlighter";
import LessonAudioPlayer from "@/components/LessonAudioPlayer";
import toast from "react-hot-toast";

interface Lesson {
  id: string;
  title: string;
  type: "TEXT" | "VIDEO" | "QUIZ";
  content?: string | null;
  duration?: number | null;
  isFree?: boolean;
}

interface Props {
  courseId: string;
  courseTitle: string;
  lessons: Lesson[];
  currentLessonId: string;
}

interface AccessState {
  isEnrolled: boolean;
  completedLessonIds: string[];
  loading: boolean;
}

const typeConfig = {
  VIDEO: { icon: PlayCircle, color: "text-orange-400", bg: "bg-orange-500/15", border: "border-orange-400/20", label: "Video" },
  TEXT:  { icon: FileText,   color: "text-blue-400",   bg: "bg-blue-500/15",   border: "border-blue-400/20",   label: "Reading" },
  QUIZ:  { icon: HelpCircle, color: "text-amber-400",  bg: "bg-amber-500/15",  border: "border-amber-400/20",  label: "Quiz" },
};

export default function LessonPageClient({ courseId, courseTitle, lessons, currentLessonId }: Props) {
  const router = useRouter();

  const lesson = lessons.find((l) => l.id === currentLessonId)!;
  const lessonIndex = lessons.findIndex((l) => l.id === currentLessonId);
  const prev = lessons[lessonIndex - 1];
  const next = lessons[lessonIndex + 1];

  // ── User-specific state (fetched client-side) ──────────────────────────────
  const [access, setAccess] = useState<AccessState>({
    isEnrolled: false,
    completedLessonIds: [],
    loading: true,
  });

  useEffect(() => {
    fetch(`/api/me/course-access/${courseId}`)
      .then((r) => r.json())
      .then((data) =>
        setAccess({ isEnrolled: data.isEnrolled, completedLessonIds: data.completedLessonIds, loading: false })
      )
      .catch(() => setAccess({ isEnrolled: false, completedLessonIds: [], loading: false }));
  }, [courseId]);

  const isEnrolled = access.isEnrolled;
  const completedSet = new Set(access.completedLessonIds);
  const completedCount = access.completedLessonIds.length;
  const allComplete = isEnrolled && lessons.length > 0 && completedCount === lessons.length;

  // ── Local optimistic completion state ─────────────────────────────────────
  const [localCompleted, setLocalCompleted] = useState<Record<string, boolean>>({});
  const isCompleted = (id: string) => localCompleted[id] ?? completedSet.has(id);
  const totalCompleted = lessons.filter((l) => isCompleted(l.id)).length;

  const [marking, setMarking] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [downloadingCert, setDownloadingCert] = useState(false);

  // Close sidebar / audio player on lesson change
  useEffect(() => {
    setShowMobileSidebar(false);
    setShowAudioPlayer(false);
  }, [currentLessonId]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft" && prev) router.push(`/courses/${courseId}/lessons/${prev.id}`);
      if (e.key === "ArrowRight" && next) router.push(`/courses/${courseId}/lessons/${next.id}`);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [prev, next, courseId, router]);

  async function toggleComplete(lessonId: string) {
    if (!isEnrolled || marking) return;
    setMarking(true);
    const next = !isCompleted(lessonId);
    setLocalCompleted((p) => ({ ...p, [lessonId]: next }));
    try {
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, completed: next }),
      });
    } catch {
      setLocalCompleted((p) => ({ ...p, [lessonId]: !next }));
    } finally {
      setMarking(false);
    }
  }

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
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${courseId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Certificate downloaded!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingCert(false);
    }
  }

  const config = typeConfig[lesson.type] ?? typeConfig.TEXT;
  const TypeIcon = config.icon;

  // Is this lesson locked for the current user?
  const isLocked = !access.loading && !lesson.isFree && !isEnrolled;

  // ── Sidebar content ────────────────────────────────────────────────────────
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Back to course */}
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <Link
          href={`/courses/${courseId}`}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="font-medium truncate">{courseTitle}</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <LayoutList className="w-4 h-4 text-orange-400 flex-shrink-0" />
          <span className="text-foreground font-semibold text-sm">Lessons</span>
        </div>
        <span className="text-xs text-muted-foreground/60 bg-secondary px-2.5 py-1 rounded-full flex-shrink-0">
          {access.loading ? "…" : `${totalCompleted}/${lessons.length}`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-secondary flex-shrink-0">
        <div
          className="h-full bg-gradient-to-r from-orange-600 to-orange-500 transition-all duration-500"
          style={{ width: `${lessons.length > 0 && !access.loading ? (totalCompleted / lessons.length) * 100 : 0}%` }}
        />
      </div>

      {/* Lesson list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {lessons.map((l, i) => {
          const isActive = l.id === currentLessonId;
          const isDone = !access.loading && isCompleted(l.id);
          const isLck = !access.loading && !isEnrolled && !l.isFree;
          const cfg = typeConfig[l.type] ?? typeConfig.TEXT;
          const LIcon = cfg.icon;

          if (isLck) {
            return (
              <div
                key={l.id}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-3.5 opacity-50 cursor-not-allowed border-l-[3px] border-l-transparent",
                  i !== lessons.length - 1 && "border-b border-b-border/50"
                )}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.04]">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground/30" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-muted-foreground truncate">{l.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <LIcon className={cn("w-3 h-3", cfg.color)} />
                    <span className={cn("text-[10px] font-medium", cfg.color)}>{cfg.label}</span>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <Link
              key={l.id}
              href={`/courses/${courseId}/lessons/${l.id}`}
              className={cn(
                "flex items-center gap-3 w-full px-4 py-3.5 transition-all border-l-[3px]",
                isActive
                  ? "bg-orange-500/10 border-l-orange-500"
                  : "border-l-transparent hover:bg-secondary",
                i !== lessons.length - 1 && "border-b border-b-border/50"
              )}
            >
              <div className={cn(
                "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs",
                isDone
                  ? "bg-emerald-500/20"
                  : isActive
                  ? "bg-orange-500/15 border border-orange-400/25"
                  : "bg-white/[0.04]"
              )}>
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isActive ? (
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse" />
                ) : (
                  <span className="text-xs text-muted-foreground/50 font-medium">{i + 1}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-[13px] font-medium leading-tight mb-0.5 truncate",
                  isActive ? "text-foreground font-semibold"
                  : isDone  ? "text-emerald-600 dark:text-emerald-300/80"
                  : "text-muted-foreground"
                )}>
                  {l.title}
                </p>
                <div className="flex items-center gap-2">
                  <LIcon className={cn("w-3 h-3", cfg.color)} />
                  <span className={cn("text-[10px] font-medium", cfg.color)}>{cfg.label}</span>
                  {l.duration && (
                    <span className="text-[10px] text-muted-foreground/50 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {l.duration}m
                    </span>
                  )}
                </div>
              </div>

              {l.isFree && !isEnrolled && (
                <span className="flex-shrink-0 text-[9px] text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-full border border-emerald-400/20 font-medium">
                  Free
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );

  // ── Locked overlay ─────────────────────────────────────────────────────────
  if (isLocked) {
    return (
      <div className="min-h-screen bg-background flex">
        {/* Sidebar still visible */}
        <aside className="hidden lg:flex flex-col flex-shrink-0 w-72 xl:w-80 border-r border-border sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto bg-card/50">
          {sidebarContent}
        </aside>
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-secondary border border-border flex items-center justify-center mb-6">
            <Lock className="w-10 h-10 text-muted-foreground/25" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Enroll to Access</h2>
          <p className="text-muted-foreground/70 max-w-sm leading-relaxed mb-6">
            This lesson is part of a paid course. Enroll to unlock all {lessons.length} lessons.
          </p>
          <Link
            href={`/courses/${courseId}`}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-orange-600/20"
          >
            View Course &amp; Enroll
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Mobile sticky bar ───────────────────────────────────────────────── */}
      <div className="lg:hidden sticky top-16 z-30 bg-card border-b border-border shadow-sm">
        <button
          onClick={() => setShowMobileSidebar((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 bg-white/[0.02]"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative flex-shrink-0">
              <LayoutList className="w-5 h-5 text-orange-400" />
              <svg className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5" viewBox="0 0 12 12">
                <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="2" className="text-secondary" />
                <circle
                  cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="2"
                  className="text-orange-400"
                  strokeDasharray={`${lessons.length > 0 ? (totalCompleted / lessons.length) * 31.4 : 0} 31.4`}
                  strokeLinecap="round"
                  transform="rotate(-90 6 6)"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-foreground truncate leading-tight">{lesson.title}</p>
              <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                {lessonIndex + 1} of {lessons.length} · {totalCompleted} done
              </p>
            </div>
          </div>
          <ChevronDown className={cn(
            "w-4 h-4 text-muted-foreground/70 transition-transform duration-300 flex-shrink-0",
            showMobileSidebar && "rotate-180 text-orange-400"
          )} />
        </button>

        <AnimatePresence>
          {showMobileSidebar && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden border-t border-border bg-card"
            >
              <div className="max-h-[60vh] overflow-y-auto">
                {sidebarContent}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Main layout ─────────────────────────────────────────────────────── */}
      <div className="flex">
        {/* ── Sticky sidebar (desktop) ── */}
        <aside className="hidden lg:flex flex-col flex-shrink-0 w-72 xl:w-80 border-r border-border sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto bg-card/50">
          {sidebarContent}
        </aside>

        {/* ── Lesson content ── */}
        <main className="flex-1 min-w-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10">

            {/* Lesson header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center border flex-shrink-0", config.bg, config.border)}>
                  <TypeIcon className={cn("w-5 h-5", config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[11px] text-muted-foreground/60 font-medium uppercase tracking-wide">
                      Lesson {lessonIndex + 1} of {lessons.length}
                    </span>
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full border", config.color, config.bg, config.border)}>
                      {config.label}
                    </span>
                    {lesson.isFree && !isEnrolled && (
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
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">{lesson.title}</h1>
                </div>
              </div>

              {/* Action bar — only for enrolled users */}
              {isEnrolled && (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                  {lesson.type === "TEXT" && lesson.content && (
                    <button
                      onClick={() => setShowAudioPlayer((v) => !v)}
                      className={cn(
                        "flex items-center gap-1.5 text-xs px-3 py-2 rounded-md border transition-all font-medium",
                        showAudioPlayer
                          ? "bg-blue-500/20 border-blue-400/30 text-blue-400"
                          : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Headphones className="w-4 h-4" />
                      {showAudioPlayer ? "Hide Audio" : "Listen"}
                    </button>
                  )}

                  <button
                    onClick={() => toggleComplete(lesson.id)}
                    disabled={marking}
                    className={cn(
                      "flex items-center gap-2 text-xs px-4 py-2 rounded-md border transition-all font-semibold ml-auto",
                      isCompleted(lesson.id)
                        ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-400"
                        : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {isCompleted(lesson.id) ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    {isCompleted(lesson.id) ? "Completed" : "Mark Complete"}
                  </button>
                </div>
              )}
            </div>

            {/* Audio player */}
            <AnimatePresence>
              {showAudioPlayer && lesson.type === "TEXT" && lesson.content && (
                <motion.div
                  key="audio"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.2 }}
                  className="mb-6"
                >
                  <LessonAudioPlayer text={lesson.content} lessonTitle={lesson.title} onClose={() => setShowAudioPlayer(false)} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Content body */}
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              {lesson.type === "QUIZ" ? (
                <div className="p-6">
                  <QuizLoader
                    lessonId={lesson.id}
                    onComplete={() => {
                      if (!isCompleted(lesson.id)) toggleComplete(lesson.id);
                    }}
                  />
                </div>
              ) : lesson.type === "VIDEO" && lesson.content ? (
                <div className="relative aspect-video bg-black">
                  <iframe
                    src={lesson.content}
                    title={lesson.title}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : lesson.content ? (
                <LessonContent content={lesson.content} lessonId={lesson.id} isEnrolled={isEnrolled} />
              ) : (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground/60">No content added yet.</p>
                </div>
              )}
            </div>

            {/* Prev / Next */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-8 pt-6 border-t border-border">
              {prev ? (
                <Link
                  href={`/courses/${courseId}/lessons/${prev.id}`}
                  className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-all group px-4 py-3 rounded-xl hover:bg-secondary border border-border/50 hover:border-border"
                >
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-[10px] text-muted-foreground/50 mb-0.5 font-medium uppercase tracking-wide">Previous</p>
                    <p className="text-sm font-semibold truncate max-w-[180px]">{prev.title}</p>
                  </div>
                </Link>
              ) : (
                <Link
                  href={`/courses/${courseId}`}
                  className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-all group px-4 py-3 rounded-xl hover:bg-secondary border border-border/50 hover:border-border"
                >
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
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
                  className="flex items-center justify-end gap-3 group bg-gradient-to-r from-orange-600/15 to-orange-500/15 border border-orange-400/20 text-primary hover:text-foreground px-4 py-3 rounded-xl transition-all hover:from-orange-600/25 hover:to-orange-500/20"
                >
                  <div className="text-right min-w-0 flex-1">
                    <p className="text-[10px] text-muted-foreground/50 mb-0.5 font-medium uppercase tracking-wide">Next</p>
                    <p className="text-sm font-semibold truncate max-w-[180px]">{next.title}</p>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ) : (
                <div className="flex items-center justify-center gap-2.5 text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-400/20 px-5 py-3 rounded-xl text-sm">
                  <Sparkles className="w-5 h-5" />
                  You&apos;ve reached the end!
                </div>
              )}
            </div>

            {/* Certificate banner */}
            {allComplete && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="mt-6 p-5 rounded-xl bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-amber-400/20 relative overflow-hidden"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
                <div className="relative flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Award className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-foreground font-bold text-sm">Course Completed!</h3>
                    <p className="text-muted-foreground/70 text-xs mt-0.5">All lessons done. Claim your certificate!</p>
                  </div>
                  <button
                    onClick={downloadCertificate}
                    disabled={downloadingCert}
                    className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold px-5 py-2.5 rounded-xl text-sm hover:from-amber-400 hover:to-yellow-400 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex-shrink-0"
                  >
                    {downloadingCert ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
                    {downloadingCert ? "Generating…" : "Get Certificate"}
                  </button>
                </div>
              </motion.div>
            )}

            <p className="text-muted-foreground/30 text-[10px] text-center mt-6 hidden lg:block">
              Use ← → arrow keys to navigate between lessons
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

// ── Quiz loader ────────────────────────────────────────────────────────────────

function QuizLoader({ lessonId, onComplete }: { lessonId: string; onComplete: () => void }) {
  const [quiz, setQuiz] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <div className="w-8 h-8 border-2 border-orange-400/25 border-t-orange-400 rounded-full animate-spin" />
    </div>
  );

  if (error || !quiz) return (
    <div className="bg-secondary/50 border border-border rounded-xl px-6 py-16 text-center">
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

// ── Content parser & renderer ─────────────────────────────────────────────────

type Block =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "code"; lang: string; code: string }
  | { type: "list"; items: string[] }
  | { type: "numlist"; items: string[] }
  | { type: "image"; src: string; alt: string }
  | { type: "paragraph"; text: string };

function parseContent(raw: string): Block[] {
  const lines = raw.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trimStart().startsWith("```")) {
      const lang = line.trim().replace(/^```/, "").trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) { codeLines.push(lines[i]); i++; }
      i++;
      blocks.push({ type: "code", lang: lang || "code", code: codeLines.join("\n") });
      continue;
    }
    if (line.startsWith("### ")) { blocks.push({ type: "h3", text: line.slice(4).trim() }); i++; continue; }
    if (line.startsWith("## "))  { blocks.push({ type: "h2", text: line.slice(3).trim() }); i++; continue; }
    if (line.startsWith("# "))   { blocks.push({ type: "h1", text: line.slice(2).trim() }); i++; continue; }

    if (/^!\[([^\]]*)\]\(([^)]+)\)$/.test(line.trim())) {
      const m = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (m) { blocks.push({ type: "image", src: m[2], alt: m[1] }); i++; continue; }
    }
    if (/^[\s]*[•\-\*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[\s]*[•\-\*]\s/.test(lines[i])) { items.push(lines[i].replace(/^[\s]*[•\-\*]\s/, "").trim()); i++; }
      blocks.push({ type: "list", items }); continue;
    }
    if (/^\d+[\.\)]\s/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[\.\)]\s/.test(lines[i].trim())) { items.push(lines[i].replace(/^\d+[\.\)]\s/, "").trim()); i++; }
      blocks.push({ type: "numlist", items }); continue;
    }
    if (line.trim() === "") { i++; continue; }

    const paraLines: string[] = [];
    while (
      i < lines.length && lines[i].trim() !== "" &&
      !lines[i].startsWith("#") && !lines[i].trimStart().startsWith("```") &&
      !/^[\s]*[•\-\*]\s/.test(lines[i]) && !/^\d+[\.\)]\s/.test(lines[i].trim())
    ) { paraLines.push(lines[i]); i++; }
    if (paraLines.length > 0) blocks.push({ type: "paragraph", text: paraLines.join(" ") });
  }
  return blocks;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.flatMap((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={`c-${i}`} className="px-1.5 py-0.5 rounded-md bg-orange-500/15 text-primary text-[0.85em] font-mono border border-orange-400/25">{part.slice(1, -1)}</code>;
    }
    const linkParts = part.split(/(\[[^\]]+\]\([^)]+\))/g);
    return linkParts.flatMap((lp, j) => {
      const m = lp.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (m) return <a key={`l-${i}-${j}`} href={m[2]} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-400 hover:underline font-medium underline-offset-4 transition-colors">{m[1]}</a>;
      const boldParts = lp.split(/(\*\*[^*]+\*\*)/g);
      return boldParts.map((bp, k) => {
        if (bp.startsWith("**") && bp.endsWith("**")) return <strong key={`b-${i}-${j}-${k}`} className="font-semibold text-foreground">{bp.slice(2, -2)}</strong>;
        return <span key={`t-${i}-${j}-${k}`}>{bp}</span>;
      });
    });
  });
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden border border-white/[0.08] bg-[#0d1117] shadow-lg my-1">
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.03] border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Code2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">{lang}</span>
        </div>
        <button
          onClick={async () => { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary"
        >
          {copied ? <><Check className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Copied</span></> : <><Copy className="w-3 h-3" />Copy</>}
        </button>
      </div>
      <div className="overflow-x-auto">
        <pre className="p-4 text-sm leading-relaxed">
          {code.split("\n").map((line, i) => (
            <div key={i} className="flex">
              <span className="select-none text-white/15 text-right w-8 mr-4 flex-shrink-0 font-mono text-xs">{i + 1}</span>
              <code className="font-mono text-emerald-300/80">{line || " "}</code>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}

function LessonContent({ content, lessonId, isEnrolled }: { content: string; lessonId: string; isEnrolled: boolean }) {
  const blocks = useMemo(() => parseContent(content), [content]);
  return (
    <div className="px-6 sm:px-10 py-8">
      <TextHighlighter lessonId={lessonId} isEnrolled={isEnrolled}>
        <div className="space-y-5">
          {blocks.map((block, i) => {
            switch (block.type) {
              case "h1": return <h1 key={i} className="text-2xl font-bold text-foreground flex items-center gap-3 pt-2 pb-1"><Hash className="w-5 h-5 text-orange-400 flex-shrink-0" />{block.text}</h1>;
              case "h2": return <h2 key={i} className="text-lg font-semibold text-foreground border-l-2 border-orange-400/40 pl-3 pt-3">{block.text}</h2>;
              case "h3": return <h3 key={i} className="text-base font-semibold text-foreground/80 pt-2">{block.text}</h3>;
              case "code": return <CodeBlock key={i} lang={block.lang} code={block.code} />;
              case "list": return (
                <ul key={i} className="space-y-2 pl-1">
                  {block.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3 text-muted-foreground text-sm leading-relaxed">
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-orange-500/40 flex-shrink-0" />
                      <span>{renderInline(item)}</span>
                    </li>
                  ))}
                </ul>
              );
              case "numlist": return (
                <ol key={i} className="space-y-2 pl-1">
                  {block.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3 text-muted-foreground text-sm leading-relaxed">
                      <span className="flex-shrink-0 w-5 h-5 rounded-md bg-orange-500/15 text-primary text-[11px] font-bold flex items-center justify-center mt-0.5">{j + 1}</span>
                      <span>{renderInline(item)}</span>
                    </li>
                  ))}
                </ol>
              );
              case "paragraph": return <p key={i} className="text-muted-foreground text-sm leading-[1.85] tracking-wide">{renderInline(block.text)}</p>;
              case "image": return (
                <div key={i} className="my-8 flex flex-col items-center">
                  <div className="relative max-w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-card/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={block.src} alt={block.alt} className="max-h-[600px] w-auto h-auto object-contain" />
                  </div>
                  {block.alt && <p className="mt-4 text-center text-xs text-muted-foreground/50 italic">{block.alt}</p>}
                </div>
              );
            }
          })}
        </div>
      </TextHighlighter>
    </div>
  );
}
