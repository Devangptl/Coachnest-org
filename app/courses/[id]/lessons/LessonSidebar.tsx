"use client";

/**
 * LessonSidebar — persistent sticky sidebar shared across all lesson pages.
 * Uses usePathname() so active lesson updates without unmounting.
 * Reads enrollment + completion state from LessonContext.
 */
import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Lock, PlayCircle, FileText, HelpCircle,
  Clock, LayoutList, ArrowLeft, ChevronDown, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLessonContext } from "./LessonProvider";

interface Lesson {
  id: string;
  title: string;
  type: "TEXT" | "VIDEO" | "QUIZ";
  duration?: number | null;
  isFree?: boolean;
}

interface Props {
  courseId: string;
  courseTitle: string;
  lessons: Lesson[];
}

const typeConfig = {
  VIDEO: { icon: PlayCircle, color: "text-orange-400", label: "Video" },
  TEXT:  { icon: FileText,   color: "text-blue-400",   label: "Reading" },
  QUIZ:  { icon: HelpCircle, color: "text-amber-400",  label: "Quiz" },
};

export default function LessonSidebar({ courseId, courseTitle, lessons }: Props) {
  const { isEnrolled, loading, isCompleted, mobileSidebarOpen, setMobileSidebarOpen } = useLessonContext();
  const pathname = usePathname();

  // Extract current lesson ID from the URL
  const currentLessonId = pathname.split(`/courses/${courseId}/lessons/`)[1]?.split("/")[0] ?? "";

  // Close mobile sidebar on lesson change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [currentLessonId, setMobileSidebarOpen]);

  const totalCompleted = loading ? 0 : lessons.filter((l) => isCompleted(l.id)).length;

  const listContent = (
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
          {loading ? "…" : `${totalCompleted}/${lessons.length}`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-secondary flex-shrink-0">
        <div
          className="h-full bg-gradient-to-r from-orange-600 to-orange-500 transition-all duration-700 ease-out"
          style={{ width: `${lessons.length > 0 && !loading ? (totalCompleted / lessons.length) * 100 : 0}%` }}
        />
      </div>

      {/* Lesson list */}
      <nav className="flex-1 overflow-y-auto min-h-0">
        {lessons.map((lesson, i) => {
          const isActive = lesson.id === currentLessonId;
          const isDone = !loading && isCompleted(lesson.id);
          const isLocked = !loading && !isEnrolled && !lesson.isFree;
          const cfg = typeConfig[lesson.type] ?? typeConfig.TEXT;
          const LIcon = cfg.icon;

          if (isLocked) {
            return (
              <div
                key={lesson.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 opacity-40 cursor-not-allowed border-l-[3px] border-l-transparent",
                  i !== lessons.length - 1 && "border-b border-b-border/50"
                )}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-secondary">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground/40" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-muted-foreground truncate">{lesson.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <LIcon className={cn("w-3 h-3", cfg.color)} />
                    <span className={cn("text-[10px] font-medium", cfg.color)}>{cfg.label}</span>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <Link
              key={lesson.id}
              href={`/courses/${courseId}/lessons/${lesson.id}`}
              className={cn(
                "flex items-center gap-3 px-4 py-3.5 transition-colors border-l-[3px]",
                isActive
                  ? "bg-orange-500/10 border-l-orange-500"
                  : "border-l-transparent hover:bg-secondary/60",
                i !== lessons.length - 1 && "border-b border-b-border/50"
              )}
            >
              {/* Status indicator */}
              <div className={cn(
                "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-colors",
                isDone
                  ? "bg-emerald-500/20"
                  : isActive
                  ? "bg-orange-500/15 border border-orange-400/30"
                  : "bg-secondary"
              )}>
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isActive ? (
                  <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                ) : (
                  <span className="text-[11px] text-muted-foreground/50 font-medium">{i + 1}</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-[13px] font-medium leading-tight mb-0.5 truncate",
                  isActive  ? "text-foreground font-semibold"
                  : isDone  ? "text-emerald-600 dark:text-emerald-300/80"
                  : "text-muted-foreground"
                )}>
                  {lesson.title}
                </p>
                <div className="flex items-center gap-2">
                  <LIcon className={cn("w-3 h-3", cfg.color)} />
                  <span className={cn("text-[10px] font-medium", cfg.color)}>{cfg.label}</span>
                  {lesson.duration && (
                    <span className="text-[10px] text-muted-foreground/50 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {lesson.duration}m
                    </span>
                  )}
                </div>
              </div>

              {lesson.isFree && !isEnrolled && (
                <span className="flex-shrink-0 text-[9px] text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-full border border-emerald-400/20 font-medium">
                  Free
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* ── Desktop sticky sidebar ── */}
      <aside className="hidden lg:flex flex-col flex-shrink-0 w-72 xl:w-80 border-r border-border sticky top-16 h-[calc(100vh-4rem)] bg-card/50">
        {listContent}
      </aside>

      {/* ── Mobile: top bar + slide-down drawer ── */}
      <div className="lg:hidden fixed top-16 left-0 right-0 z-30 bg-card border-b border-border shadow-sm">
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Mini progress ring */}
            <div className="relative flex-shrink-0">
              <LayoutList className="w-5 h-5 text-orange-400" />
              <svg className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5" viewBox="0 0 12 12">
                <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="2" className="text-secondary" />
                <circle
                  cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="2"
                  className="text-orange-400"
                  strokeDasharray={`${lessons.length > 0 && !loading ? (totalCompleted / lessons.length) * 31.4 : 0} 31.4`}
                  strokeLinecap="round"
                  transform="rotate(-90 6 6)"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
                {lessons.find((l) => l.id === currentLessonId)?.title ?? "Lessons"}
              </p>
              <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                {(lessons.findIndex((l) => l.id === currentLessonId) + 1)} of {lessons.length} · {loading ? "…" : totalCompleted} done
              </p>
            </div>
          </div>
          {mobileSidebarOpen ? (
            <X className="w-4 h-4 text-muted-foreground/70 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground/70 flex-shrink-0" />
          )}
        </button>

        <AnimatePresence>
          {mobileSidebarOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden border-t border-border bg-card"
            >
              <div className="max-h-[60vh] overflow-y-auto">
                {listContent}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
