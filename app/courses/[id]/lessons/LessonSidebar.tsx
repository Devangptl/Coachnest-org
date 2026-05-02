"use client";

/**
 * LessonSidebar — persistent sticky sidebar shared across all lesson pages.
 * Supports chapter-based (sectioned) courses with collapsible accordions,
 * as well as flat (unsectioned) lesson lists.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Lock, PlayCircle, FileText, HelpCircle,
  Clock, LayoutList, ArrowLeft, ChevronDown, X, Headphones,
  BookOpen,
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

interface Section {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

interface Props {
  courseId: string;
  courseTitle: string;
  sections: Section[];
  ungroupedLessons: Lesson[];
}

const typeConfig = {
  VIDEO: { icon: PlayCircle, color: "text-[#d97757]", label: "Video" },
  TEXT:  { icon: FileText,   color: "text-blue-400",   label: "Reading" },
  QUIZ:  { icon: HelpCircle, color: "text-amber-400",  label: "Quiz" },
};

export default function LessonSidebar({ courseId, courseTitle, sections, ungroupedLessons }: Props) {
  const { isEnrolled, loading, isCompleted, mobileSidebarOpen, setMobileSidebarOpen } = useLessonContext();
  const pathname = usePathname();

  const currentLessonId = pathname.split(`/courses/${courseId}/lessons/`)[1]?.split("/")[0] ?? "";

  const allLessons = useMemo(
    () => [...sections.flatMap((s) => s.lessons), ...ungroupedLessons],
    [sections, ungroupedLessons]
  );

  const hasSections = sections.length > 0;

  // All sections open by default
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(sections.map((s) => s.id))
  );

  // Auto-open section containing the active lesson when navigating
  useEffect(() => {
    for (const section of sections) {
      if (section.lessons.some((l) => l.id === currentLessonId)) {
        setOpenSections((prev) => {
          if (prev.has(section.id)) return prev;
          return new Set([...prev, section.id]);
        });
        break;
      }
    }
  }, [currentLessonId, sections]);

  // Close mobile sidebar on lesson change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [currentLessonId, setMobileSidebarOpen]);

  const totalCompleted = loading ? 0 : allLessons.filter((l) => isCompleted(l.id)).length;

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const renderLesson = (lesson: Lesson, localIndex: number, isLast: boolean) => {
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
            "flex items-center gap-3 px-4 py-3 opacity-40 cursor-not-allowed border-l-[3px] border-l-transparent",
            !isLast && "border-b border-b-border/50"
          )}
        >
          <div className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center bg-secondary">
            <Lock className="w-3 h-3 text-muted-foreground/40" />
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
          "flex items-center gap-3 px-4 py-3 transition-colors border-l-[3px]",
          isActive
            ? "bg-orange-500/10 border-l-orange-500"
            : "border-l-transparent hover:bg-secondary/60",
          !isLast && "border-b border-b-border/50"
        )}
      >
        <div className={cn(
          "flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-xs transition-colors",
          isDone
            ? "bg-emerald-500/20"
            : isActive
            ? "bg-orange-500/15 border border-[#d97757]/30"
            : "bg-secondary"
        )}>
          {isDone ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : isActive ? (
            <div className="w-1.5 h-1.5 rounded-full bg-[#d97757] animate-pulse" />
          ) : (
            <span className="text-[10px] text-muted-foreground/50 font-medium">{localIndex + 1}</span>
          )}
        </div>

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
            {lesson.type === "TEXT" && (
              <span className="ml-auto flex items-center gap-0.5 text-emerald-400/60 flex-shrink-0" title="Audio Mode available">
                <Headphones className="w-2.5 h-2.5" />
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
  };

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
          {hasSections ? (
            <BookOpen className="w-4 h-4 text-[#d97757] flex-shrink-0" />
          ) : (
            <LayoutList className="w-4 h-4 text-[#d97757] flex-shrink-0" />
          )}
          <span className="text-foreground font-semibold text-sm">
            {hasSections
              ? `${sections.length} Chapter${sections.length !== 1 ? "s" : ""}`
              : "Lessons"}
          </span>
        </div>
        <span className="text-xs text-muted-foreground/60 bg-secondary px-2.5 py-1 rounded-full flex-shrink-0">
          {loading ? "…" : `${totalCompleted}/${allLessons.length}`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-secondary flex-shrink-0">
        <div
          className="h-full bg-gradient-to-r from-orange-600 to-orange-500 transition-all duration-700 ease-out"
          style={{ width: `${allLessons.length > 0 && !loading ? (totalCompleted / allLessons.length) * 100 : 0}%` }}
        />
      </div>

      {/* Content list */}
      <nav className="flex-1 overflow-y-auto min-h-0">
        {hasSections ? (
          <>
            {sections.map((section, sIdx) => {
              const isOpen = openSections.has(section.id);
              const sectionCompleted = loading ? 0 : section.lessons.filter((l) => isCompleted(l.id)).length;
              const hasActiveLesson = section.lessons.some((l) => l.id === currentLessonId);

              return (
                <div key={section.id} className="border-b border-border/50">
                  {/* Chapter header — clickable accordion toggle */}
                  <button
                    onClick={() => toggleSection(section.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors text-left",
                      hasActiveLesson && "bg-orange-500/5"
                    )}
                  >
                    <div className={cn(
                      "flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold border",
                      hasActiveLesson
                        ? "bg-orange-500/15 border-[#d97757]/30 text-[#d97757]"
                        : "bg-secondary border-border/50 text-muted-foreground/60"
                    )}>
                      {sIdx + 1}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className={cn(
                        "text-[13px] font-semibold leading-tight truncate",
                        hasActiveLesson ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {section.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                        {sectionCompleted}/{section.lessons.length} lessons
                        {sectionCompleted === section.lessons.length && section.lessons.length > 0 && (
                          <span className="ml-1.5 text-emerald-400">✓</span>
                        )}
                      </p>
                    </div>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-muted-foreground/40 flex-shrink-0 transition-transform duration-200",
                        isOpen ? "rotate-0" : "-rotate-90"
                      )}
                    />
                  </button>

                  {/* Animated lesson list */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="lessons"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="bg-background/50 border-t border-border/40">
                          {section.lessons.map((lesson, lIdx) =>
                            renderLesson(lesson, lIdx, lIdx === section.lessons.length - 1)
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {/* Ungrouped lessons (no section assigned) */}
            {ungroupedLessons.length > 0 && (
              <div>
                {ungroupedLessons.map((lesson, lIdx) =>
                  renderLesson(lesson, lIdx, lIdx === ungroupedLessons.length - 1)
                )}
              </div>
            )}
          </>
        ) : (
          // Flat list when no sections exist
          allLessons.map((lesson, i) =>
            renderLesson(lesson, i, i === allLessons.length - 1)
          )
        )}
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
            <div className="relative flex-shrink-0">
              {hasSections ? (
                <BookOpen className="w-5 h-5 text-[#d97757]" />
              ) : (
                <LayoutList className="w-5 h-5 text-[#d97757]" />
              )}
              <svg className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5" viewBox="0 0 12 12">
                <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="2" className="text-secondary" />
                <circle
                  cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="2"
                  className="text-[#d97757]"
                  strokeDasharray={`${allLessons.length > 0 && !loading ? (totalCompleted / allLessons.length) * 31.4 : 0} 31.4`}
                  strokeLinecap="round"
                  transform="rotate(-90 6 6)"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
                {allLessons.find((l) => l.id === currentLessonId)?.title ?? "Lessons"}
              </p>
              <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                {(allLessons.findIndex((l) => l.id === currentLessonId) + 1)} of {allLessons.length} · {loading ? "…" : totalCompleted} done
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
