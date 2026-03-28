"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Lock,
  PlayCircle,
  FileText,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  Sparkles,
  Eye,
  BookOpen,
  LayoutList,
  Copy,
  Check,
  Code2,
  Hash,
  List,
  Type,
  Award,
  Download,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import QuizPlayer from "@/components/QuizPlayer";
import TextHighlighter from "@/components/TextHighlighter";
import toast from "react-hot-toast";

interface Lesson {
  id: string;
  title: string;
  type: "TEXT" | "VIDEO" | "QUIZ";
  content?: string | null;
  duration?: number | null;
  isFree?: boolean;
  completed: boolean;
}

interface Props {
  courseId: string;
  lessons: Lesson[];
  isEnrolled: boolean;
  onCompletionChange?: (lessonId: string, completed: boolean) => void;
}

const typeConfig = {
  VIDEO: { icon: PlayCircle, color: "text-orange-400", bg: "bg-orange-500/15", border: "border-orange-400/20", label: "Video Lesson" },
  TEXT:  { icon: FileText, color: "text-blue-400", bg: "bg-blue-500/15", border: "border-blue-400/20", label: "Text Lesson" },
  QUIZ:  { icon: HelpCircle, color: "text-amber-400", bg: "bg-amber-500/15", border: "border-amber-400/20", label: "Quiz" },
};

export default function CourseViewer({ courseId, lessons, isEnrolled, onCompletionChange }: Props) {
  const [activeLessonId, setActiveLessonId] = useState<string>(() => {
    if (isEnrolled) return lessons[0]?.id ?? "";
    const firstFree = lessons.find((l) => l.isFree);
    return firstFree?.id ?? lessons[0]?.id ?? "";
  });
  const [completed, setCompleted] = useState<Record<string, boolean>>(
    Object.fromEntries(lessons.map((l) => [l.id, l.completed]))
  );
  const [marking, setMarking] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [downloadingCert, setDownloadingCert] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const activeLesson = lessons.find((l) => l.id === activeLessonId);
  const activeIndex = lessons.findIndex((l) => l.id === activeLessonId);
  const prev = lessons[activeIndex - 1];
  const next = lessons[activeIndex + 1];
  const completedCount = Object.values(completed).filter(Boolean).length;
  const allComplete = isEnrolled && lessons.length > 0 && completedCount === lessons.length;

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

  async function toggleComplete(lessonId: string) {
    if (!isEnrolled || marking) return;
    setMarking(true);
    const nextVal = !completed[lessonId];
    setCompleted((prev) => ({ ...prev, [lessonId]: nextVal }));
    onCompletionChange?.(lessonId, nextVal);
    try {
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, completed: nextVal }),
      });
    } catch {
      setCompleted((prev) => ({ ...prev, [lessonId]: !nextVal }));
      onCompletionChange?.(lessonId, !nextVal);
    } finally {
      setMarking(false);
    }
  }

  const selectLesson = useCallback((id: string) => {
    setActiveLessonId(id);
    contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft" && prev) selectLesson(prev.id);
      if (e.key === "ArrowRight" && next) selectLesson(next.id);
      if (e.key === "Escape" && isFullscreen) setIsFullscreen(false);
      if ((e.key === "f" || e.key === "F") && isEnrolled && !isFullscreen) setIsFullscreen(true);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prev, next, selectLesson, isFullscreen, isEnrolled]);

  // Lock body scroll when fullscreen is active
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isFullscreen]);

  const sidebarContent = (
    <>
      {/* Sidebar header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <LayoutList className="w-4 h-4 text-orange-400" />
          <span className="text-foreground font-semibold text-sm">Lessons</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground/60 bg-secondary px-2.5 py-1 rounded-full">
            {completedCount}/{lessons.length}
          </span>
          <button
            onClick={() => setShowSidebar(false)}
            className="hidden lg:flex p-1.5 hover:bg-secondary rounded-md text-muted-foreground/70 hover:text-foreground transition-colors"
            title="Close sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mini progress bar */}
      <div className="h-1 bg-secondary flex-shrink-0">
        <div
          className="h-full bg-gradient-to-r from-orange-600 to-orange-500 transition-all duration-500"
          style={{ width: `${lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0}%` }}
        />
      </div>

      {/* Lesson list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {lessons.map((lesson, i) => {
          const isActive = lesson.id === activeLessonId;
          const isCompleted = completed[lesson.id];
          const config = typeConfig[lesson.type] ?? typeConfig.TEXT;
          const Icon = config.icon;

          const isLocked = !isEnrolled && !lesson.isFree;

          return (
            <button
              key={lesson.id}
              onClick={() => {
                if (isLocked) return;
                selectLesson(lesson.id);
              }}
              disabled={isLocked}
              className={cn(
                "flex items-center gap-3 w-full px-5 py-3.5 text-left transition-all",
                isLocked && "opacity-50 cursor-not-allowed",
                isActive
                  ? "bg-orange-500/10 border-l-[3px] border-l-orange-500"
                  : "border-l-[3px] border-l-transparent hover:bg-secondary",
                i !== lessons.length - 1 && "border-b border-b-border/50"
              )}
            >
              {/* Number / status */}
              <div className={cn(
                "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs",
                isLocked
                  ? "bg-white/[0.04]"
                  : isCompleted
                  ? "bg-emerald-500/20"
                  : isActive
                  ? "bg-orange-500/15 border border-orange-400/25"
                  : "bg-white/[0.04]"
              )}>
                {isLocked ? (
                  <Lock className="w-3.5 h-3.5 text-muted-foreground/30" />
                ) : isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isActive ? (
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse" />
                ) : (
                  <span className="text-xs text-muted-foreground/50 font-medium">{i + 1}</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-xs font-medium leading-tight mb-0.5 truncate",
                  isActive ? "text-foreground font-semibold" : isCompleted ? "text-emerald-600 dark:text-emerald-300/80" : "text-muted-foreground"
                )}>
                  {lesson.title}
                </p>
                <div className="flex items-center gap-2">
                  <Icon className={cn("w-3 h-3", config.color)} />
                  <span className={cn("text-[10px] font-medium", config.color)}>
                    {config.label}
                  </span>
                  {lesson.duration && (
                    <span className="text-[10px] text-muted-foreground/50 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {lesson.duration}m
                    </span>
                  )}
                </div>
              </div>

              {/* Free badge */}
              {lesson.isFree && (
                <span className="flex-shrink-0 text-[9px] text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-full border border-emerald-400/20 font-medium">
                  Free
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );

  return (
    <div ref={contentRef} className="flex flex-col lg:flex-row gap-0 lg:gap-0 rounded-lg overflow-hidden border border-border backdrop-blur-md bg-white/[0.03]">
      {/* ── Left: Lesson sidebar ── */}
      <AnimatePresence initial={false} mode="wait">
        {showSidebar && (
          <motion.div
            key="desktop-sidebar"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 300 }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="hidden lg:flex flex-col flex-shrink-0 border-r border-border bg-white/[0.02]"
          >
            <div className="w-[300px] flex flex-col h-full max-h-[600px]">
              {sidebarContent}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false} mode="wait">
        {showSidebar && (
          <motion.div
            key="mobile-sidebar"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="lg:hidden flex flex-col border-b border-border bg-white/[0.02]"
          >
            <div className="w-full flex flex-col max-h-[500px]">
              {sidebarContent}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile toggle ── */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="lg:hidden flex items-center justify-between gap-3 px-5 py-3 bg-white/[0.03] border-b border-border"
      >
        <div className="flex items-center gap-2 text-sm">
          <LayoutList className="w-4 h-4 text-orange-400" />
          <span className="text-muted-foreground truncate">
            {activeIndex + 1}. {activeLesson?.title ?? "Select lesson"}
          </span>
        </div>
        <ChevronDown className={cn(
          "w-4 h-4 text-muted-foreground/70 transition-transform",
          showSidebar && "rotate-180"
        )} />
      </button>

      {/* ── Right: Content area ── */}
      <div className="flex-1 min-w-0 flex flex-col relative">
        {!isEnrolled && !activeLesson?.isFree ? (
          <div className="flex flex-col items-center justify-center py-28 px-6 text-center flex-1">
            {!showSidebar && (
              <button
                onClick={() => setShowSidebar(true)}
                className="hidden lg:flex absolute top-6 left-6 items-center justify-center w-10 h-10 rounded-xl border border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary transition-all z-10"
                title="Show Lessons"
              >
                <LayoutList className="w-5 h-5" />
              </button>
            )}
            <div className="w-24 h-24 rounded-xl bg-secondary border border-border flex items-center justify-center mb-6">
              <Lock className="w-12 h-12 text-muted-foreground/25" />
            </div>
            <h3 className="text-foreground text-2xl font-bold mb-3">
              Enroll to Access Content
            </h3>
            <p className="text-muted-foreground/70 text-base max-w-md leading-relaxed">
              Get full access to all {lessons.length} lessons, quizzes, and downloadable resources.
            </p>
          </div>
        ) : activeLesson ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeLesson.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {/* Lesson header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 sm:px-6 py-3.5 border-b border-border">
                <div className="flex items-center gap-3.5 min-w-0">
                  {!showSidebar && (
                    <button
                      onClick={() => setShowSidebar(true)}
                      className="hidden lg:flex items-center justify-center w-10 h-10 rounded-xl border border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary transition-all flex-shrink-0 z-10"
                      title="Show Lessons"
                    >
                      <LayoutList className="w-5 h-5" />
                    </button>
                  )}
                  {/* Type icon */}
                  {(() => {
                    const config = typeConfig[activeLesson.type] ?? typeConfig.TEXT;
                    const Icon = config.icon;
                    return (
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border",
                        config.bg, config.border
                      )}>
                        <Icon className={cn("w-5 h-5", config.color)} />
                      </div>
                    );
                  })()}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-muted-foreground/50 text-[10px] font-medium">
                        Lesson {activeIndex + 1} of {lessons.length}
                      </span>
                      {activeLesson.isFree && (
                        <span className="flex items-center gap-1 text-[9px] text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-full border border-emerald-400/20 font-medium">
                          <Eye className="w-2 h-2" />
                          Free Preview
                        </span>
                      )}
                      {activeLesson.duration && (
                        <span className="flex items-center gap-1 text-[9px] text-muted-foreground/50">
                          <Clock className="w-2.5 h-2.5" />
                          {activeLesson.duration} min
                        </span>
                      )}
                    </div>
                    <h2 className="text-foreground font-bold text-base sm:text-lg leading-tight truncate">
                      {activeLesson.title}
                    </h2>
                  </div>
                </div>

                {/* Actions — only for enrolled users */}
                {isEnrolled && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setIsFullscreen(true)}
                      className="flex items-center justify-center w-9 h-9 rounded-xl border border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                      title="Full Screen (F)"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleComplete(activeLesson.id)}
                      disabled={marking}
                      className={cn(
                        "flex items-center gap-2 text-xs px-4 py-2 rounded-xl border transition-all font-semibold",
                        completed[activeLesson.id]
                          ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-400"
                          : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                      )}
                    >
                      {completed[activeLesson.id] ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </motion.div>
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                      <span>{completed[activeLesson.id] ? "Completed" : "Mark Complete"}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Content body */}
              <div className="px-6 sm:px-8 py-6 sm:py-8">
                {activeLesson.type === "QUIZ" ? (
                  <QuizLoader
                    lessonId={activeLesson.id}
                    onComplete={() => {
                      if (!completed[activeLesson.id]) toggleComplete(activeLesson.id);
                    }}
                  />
                ) : activeLesson.type === "VIDEO" && activeLesson.content ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-card border border-white/5 shadow-xl shadow-black/30">
                    <iframe
                      src={activeLesson.content}
                      title={activeLesson.title}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : activeLesson.content ? (
                  <LessonContent content={activeLesson.content} lessonId={activeLesson.id} isEnrolled={isEnrolled} />
                ) : (
                  <div className="bg-secondary/50 border border-border rounded-xl px-6 py-16 text-center">
                    <FileText className="w-14 h-14 text-muted-foreground/25 mx-auto mb-4" />
                    <p className="text-muted-foreground/60 text-base">No content added yet.</p>
                    <p className="text-muted-foreground/40 text-sm mt-1">Content will appear here once the instructor adds it.</p>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-8 pt-6 border-t border-border">
                  {prev ? (
                    <button
                      onClick={() => selectLesson(prev.id)}
                      className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors group px-4 py-3 rounded-xl hover:bg-secondary border border-transparent hover:border-border"
                    >
                      <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 group-hover:bg-secondary transition-colors">
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] text-muted-foreground/50 mb-0.5 font-medium uppercase tracking-wide">Previous</p>
                        <p className="text-sm font-semibold truncate max-w-[180px]">{prev.title}</p>
                      </div>
                    </button>
                  ) : (
                    <span />
                  )}
                  {next ? (
                    <button
                      onClick={() => selectLesson(next.id)}
                      className="flex items-center gap-3 group bg-gradient-to-r from-orange-600/15 to-orange-500/15 border border-orange-400/20 text-primary hover:text-foreground px-4 py-3 rounded-xl transition-all hover:border-orange-400/25 hover:from-orange-600/25 hover:to-orange-500/15"
                    >
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground/50 mb-0.5 font-medium uppercase tracking-wide">Next</p>
                        <p className="text-sm font-semibold truncate max-w-[180px]">{next.title}</p>
                      </div>
                      <div className="w-9 h-9 rounded-lg bg-orange-500/15 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-500/20 transition-colors">
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2.5 text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-400/20 px-5 py-3 rounded-xl text-sm">
                      <Sparkles className="w-5 h-5" />
                      You&apos;ve reached the end!
                    </div>
                  )}
                </div>

                {/* Get Certificate banner — appears when all lessons are complete */}
                {allComplete && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    className="mt-6 p-5 rounded-lg bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-amber-400/20 relative overflow-hidden"
                  >
                    {/* Shimmer */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent"
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    />
                    <div className="relative flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/10">
                        <Award className="w-6 h-6 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-foreground font-bold text-sm">🎉 Course Completed!</h3>
                        <p className="text-muted-foreground/70 text-xs mt-0.5">You&apos;ve finished all lessons. Claim your certificate now!</p>
                      </div>
                      <button
                        onClick={downloadCertificate}
                        disabled={downloadingCert}
                        className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold px-5 py-2.5 rounded-xl text-sm hover:from-amber-400 hover:to-yellow-400 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex-shrink-0"
                      >
                        {downloadingCert ? (
                          <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        {downloadingCert ? "Generating..." : "Get Certificate"}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Keyboard shortcut hint */}
                <p className="text-muted-foreground/30 text-[10px] text-center mt-4 hidden lg:block">
                  Use ← → arrow keys to navigate between lessons
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="text-center py-24 px-6 flex-1 flex flex-col items-center justify-center relative min-h-[400px]">
            {!showSidebar && (
              <button
                onClick={() => setShowSidebar(true)}
                className="hidden lg:flex absolute top-6 left-6 items-center justify-center w-10 h-10 rounded-xl border border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary transition-all z-10"
                title="Show Lessons"
              >
                <LayoutList className="w-5 h-5" />
              </button>
            )}
            <BookOpen className="w-14 h-14 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground/70 text-lg">No lessons in this course yet.</p>
          </div>
        )}
      </div>
      {/* ── Fullscreen overlay (portal) ── */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {isFullscreen && activeLesson && (
            <motion.div
              key="fullscreen-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-[9999] flex flex-col bg-background"
            >
              {/* ── Top bar ── */}
              <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border bg-white/[0.02] flex-shrink-0">
                <div className="flex items-center gap-4 min-w-0">
                  {(() => {
                    const config = typeConfig[activeLesson.type] ?? typeConfig.TEXT;
                    const Icon = config.icon;
                    return (
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border",
                        config.bg, config.border
                      )}>
                        <Icon className={cn("w-5 h-5", config.color)} />
                      </div>
                    );
                  })()}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-muted-foreground/50 text-xs font-medium">
                        Lesson {activeIndex + 1} of {lessons.length}
                      </span>
                      {activeLesson.duration && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                          <Clock className="w-2.5 h-2.5" />
                          {activeLesson.duration} min
                        </span>
                      )}
                    </div>
                    <h2 className="text-foreground font-bold text-lg leading-tight truncate">
                      {activeLesson.title}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Mark complete in fullscreen */}
                  <button
                    onClick={() => toggleComplete(activeLesson.id)}
                    disabled={marking}
                    className={cn(
                      "flex items-center gap-2 text-sm px-4 py-2 rounded-xl border transition-all font-semibold",
                      completed[activeLesson.id]
                        ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-400"
                        : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    {completed[activeLesson.id] ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">
                      {completed[activeLesson.id] ? "Completed" : "Mark Complete"}
                    </span>
                  </button>

                  {/* Exit fullscreen */}
                  <button
                    onClick={() => setIsFullscreen(false)}
                    className="flex items-center justify-center w-10 h-10 rounded-xl border border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                    title="Exit Full Screen (Esc)"
                  >
                    <Minimize2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              {/* ── Scrollable content ── */}
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto px-6 sm:px-10 py-8 sm:py-12">
                  {activeLesson.type === "QUIZ" ? (
                    <QuizLoader
                      lessonId={activeLesson.id}
                      onComplete={() => {
                        if (!completed[activeLesson.id]) toggleComplete(activeLesson.id);
                      }}
                    />
                  ) : activeLesson.type === "VIDEO" && activeLesson.content ? (
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-card border border-white/5 shadow-2xl shadow-black/40">
                      <iframe
                        src={activeLesson.content}
                        title={activeLesson.title}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : activeLesson.content ? (
                    <LessonContent content={activeLesson.content} lessonId={activeLesson.id} isEnrolled={isEnrolled} />
                  ) : (
                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-6 py-16 text-center">
                      <FileText className="w-14 h-14 text-white/10 mx-auto mb-4" />
                      <p className="text-white/30 text-base">No content added yet.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Bottom navigation bar ── */}
              <div className="flex items-center justify-between gap-4 px-6 py-3 border-t border-border bg-white/[0.02] flex-shrink-0">
                {prev ? (
                  <button
                    onClick={() => selectLesson(prev.id)}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-xl hover:bg-secondary text-sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline truncate max-w-[200px]">{prev.title}</span>
                    <span className="sm:hidden">Previous</span>
                  </button>
                ) : <span />}

                <p className="text-muted-foreground/30 text-[10px] hidden lg:block">
                  ← → navigate · Esc exit
                </p>

                {next ? (
                  <button
                    onClick={() => selectLesson(next.id)}
                    className="flex items-center gap-2 text-primary hover:text-foreground bg-orange-500/15 border border-orange-400/20 px-3 py-2 rounded-xl hover:bg-orange-500/15 transition-all text-sm"
                  >
                    <span className="hidden sm:inline truncate max-w-[200px]">{next.title}</span>
                    <span className="sm:hidden">Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                    <Sparkles className="w-4 h-4" />
                    End of course
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
}

// ── Rich content renderer ────────────────────────────────────────────────────

type Block =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "code"; lang: string; code: string }
  | { type: "list"; items: string[] }
  | { type: "numlist"; items: string[] }
  | { type: "paragraph"; text: string };

function parseContent(raw: string): Block[] {
  const lines = raw.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trimStart().startsWith("```")) {
      const lang = line.trim().replace(/^```/, "").trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({ type: "code", lang: lang || "code", code: codeLines.join("\n") });
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      blocks.push({ type: "h3", text: line.slice(4).trim() });
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ type: "h2", text: line.slice(3).trim() });
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push({ type: "h1", text: line.slice(2).trim() });
      i++;
      continue;
    }

    // Bullet list (•, -, *)
    if (/^[\s]*[•\-\*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[\s]*[•\-\*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[\s]*[•\-\*]\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    // Numbered list
    if (/^\d+[\.\)]\s/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[\.\)]\s/.test(lines[i].trim())) {
        items.push(lines[i].replace(/^\s*\d+[\.\)]\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "numlist", items });
      continue;
    }

    // Empty line → skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph — collect consecutive non-empty, non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].trimStart().startsWith("```") &&
      !/^[\s]*[•\-\*]\s/.test(lines[i]) &&
      !/^\d+[\.\)]\s/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: "paragraph", text: paraLines.join(" ") });
    }
  }

  return blocks;
}

function renderInline(text: string) {
  // Split on inline code `...`
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded-md bg-orange-500/15 text-primary text-[0.85em] font-mono border border-orange-400/25"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    // Bold **text**
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((bp, j) => {
      if (bp.startsWith("**") && bp.endsWith("**")) {
        return <strong key={`${i}-${j}`} className="font-semibold text-foreground">{bp.slice(2, -2)}</strong>;
      }
      return <span key={`${i}-${j}`}>{bp}</span>;
    });
  });
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl overflow-hidden border border-white/[0.08] bg-[#0d1117] shadow-lg my-1">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.03] border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Code2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">{lang}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy
            </>
          )}
        </button>
      </div>
      {/* Code body with line numbers */}
      <div className="overflow-x-auto">
        <pre className="p-4 text-sm leading-relaxed">
          {code.split("\n").map((line, i) => (
            <div key={i} className="flex">
              <span className="select-none text-white/15 text-right w-8 mr-4 flex-shrink-0 font-mono text-xs leading-relaxed">
                {i + 1}
              </span>
              <code className="font-mono text-emerald-300/80">{line || " "}</code>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}

// ── Quiz loader (fetches quiz by lesson ID then renders QuizPlayer) ──────────

function QuizLoader({ lessonId, onComplete }: { lessonId: string; onComplete: () => void }) {
  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setQuiz(null);
    fetch(`/api/lessons/${lessonId}/quiz`)
      .then((r) => (r.ok ? r.json() : r.json().then((d) => Promise.reject(d.error))))
      .then(setQuiz)
      .catch((e) => setError(typeof e === "string" ? e : "Failed to load quiz"))
      .finally(() => setLoading(false));
  }, [lessonId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-orange-400/25 border-t-orange-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="bg-secondary/50 border border-border rounded-xl px-6 py-16 text-center">
        <HelpCircle className="w-14 h-14 text-muted-foreground/25 mx-auto mb-4" />
        <p className="text-muted-foreground/60 text-base">{error || "No quiz available for this lesson."}</p>
      </div>
    );
  }

  return (
    <QuizPlayer
      quiz={quiz}
      onComplete={(score, passed) => {
        if (passed) onComplete();
      }}
    />
  );
}

function LessonContent({ content, lessonId, isEnrolled }: { content: string; lessonId: string; isEnrolled: boolean }) {
  const blocks = useMemo(() => parseContent(content), [content]);

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Article header */}
      <div className="bg-secondary/50 border-b border-border px-6 sm:px-8 py-3 flex items-center gap-2">
        <Type className="w-3.5 h-3.5 text-orange-400" />
        <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">Lesson Content</span>
      </div>

      {/* Content body */}
      <div className="px-6 sm:px-8 py-6 sm:py-8 bg-card">
        <TextHighlighter lessonId={lessonId} isEnrolled={isEnrolled}>
          <div className="max-w-3xl mx-auto space-y-5">
            {blocks.map((block, i) => {
              switch (block.type) {
                case "h1":
                  return (
                    <h1 key={i} data-block-index={i} className="text-2xl font-bold text-foreground flex items-center gap-3 pt-2 pb-1">
                      <Hash className="w-5 h-5 text-orange-400 flex-shrink-0" />
                      {block.text}
                    </h1>
                  );
                case "h2":
                  return (
                    <h2
                      key={i}
                      data-block-index={i}
                      className="text-lg font-semibold text-foreground border-l-2 border-orange-400/40 pl-3 pt-3"
                    >
                      {block.text}
                    </h2>
                  );
                case "h3":
                  return (
                    <h3 key={i} data-block-index={i} className="text-base font-semibold text-foreground/80 pt-2">
                      {block.text}
                    </h3>
                  );
                case "code":
                  return <CodeBlock key={i} lang={block.lang} code={block.code} />;
                case "list":
                  return (
                    <ul key={i} data-block-index={i} className="space-y-2 pl-1">
                      {block.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-3 text-muted-foreground text-sm leading-relaxed">
                          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-orange-500/15 flex-shrink-0" />
                          <span>{renderInline(item)}</span>
                        </li>
                      ))}
                    </ul>
                  );
                case "numlist":
                  return (
                    <ol key={i} data-block-index={i} className="space-y-2 pl-1">
                      {block.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-3 text-muted-foreground text-sm leading-relaxed">
                          <span className="flex-shrink-0 w-5 h-5 rounded-md bg-orange-500/15 text-primary text-[11px] font-bold flex items-center justify-center mt-0.5">
                            {j + 1}
                          </span>
                          <span>{renderInline(item)}</span>
                        </li>
                      ))}
                    </ol>
                  );
                case "paragraph":
                  return (
                    <p key={i} data-block-index={i} className="text-muted-foreground text-sm leading-[1.85] tracking-wide">
                      {renderInline(block.text)}
                    </p>
                  );
              }
            })}
          </div>
        </TextHighlighter>
      </div>
    </div>
  );
}
