"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Lock, PlayCircle, FileText, HelpCircle,
  Clock, LayoutList, ArrowLeft, ChevronDown, X, Headphones,
  BookOpen, ChevronsUpDown, ChevronsDownUp, Trophy,
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
  VIDEO: { icon: PlayCircle, color: "text-[#d97757]", bg: "bg-orange-500/10", label: "Video" },
  TEXT:  { icon: FileText,   color: "text-blue-400",   bg: "bg-blue-500/10",   label: "Reading" },
  QUIZ:  { icon: HelpCircle, color: "text-amber-400",  bg: "bg-amber-500/10",  label: "Quiz" },
};

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function LessonSidebar({ courseId, courseTitle, sections, ungroupedLessons }: Props) {
  const { isEnrolled, loading, isCompleted, mobileSidebarOpen, setMobileSidebarOpen } = useLessonContext();
  const pathname = usePathname();

  const currentLessonId = pathname.split(`/courses/${courseId}/lessons/`)[1]?.split("/")[0] ?? "";

  const allLessons = useMemo(
    () => [...sections.flatMap((s) => s.lessons), ...ungroupedLessons],
    [sections, ungroupedLessons]
  );

  const hasSections = sections.length > 0;

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

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [currentLessonId, setMobileSidebarOpen]);

  const totalCompleted = loading ? 0 : allLessons.filter((l) => isCompleted(l.id)).length;
  const completionPct  = allLessons.length > 0 && !loading
    ? Math.round((totalCompleted / allLessons.length) * 100)
    : 0;

  const totalDuration = useMemo(
    () => allLessons.reduce((acc, l) => acc + (l.duration ?? 0), 0),
    [allLessons]
  );
  const completedDuration = useMemo(
    () => !loading ? allLessons.filter((l) => isCompleted(l.id)).reduce((acc, l) => acc + (l.duration ?? 0), 0) : 0,
    [allLessons, loading, isCompleted]
  );
  const remainingDuration = Math.max(0, totalDuration - completedDuration);

  const allOpen   = openSections.size === sections.length;
  const toggleAll = () => {
    if (allOpen) setOpenSections(new Set());
    else         setOpenSections(new Set(sections.map((s) => s.id)));
  };

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
    const isDone   = !loading && isCompleted(lesson.id);
    const isLocked = !loading && !isEnrolled && !lesson.isFree;
    const cfg      = typeConfig[lesson.type] ?? typeConfig.TEXT;
    const LIcon    = cfg.icon;

    if (isLocked) {
      return (
        <div
          key={lesson.id}
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 opacity-40 cursor-not-allowed",
            !isLast && "border-b border-b-border/30"
          )}
        >
          <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-secondary border border-border/50">
            <Lock className="w-3 h-3 text-muted-foreground/40" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-muted-foreground truncate">{lesson.title}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <LIcon className={cn("w-3 h-3", cfg.color)} />
              <span className={cn("text-[10px] font-medium", cfg.color)}>{cfg.label}</span>
            </div>
          </div>
          <Lock className="w-3 h-3 text-muted-foreground/30 flex-shrink-0" />
        </div>
      );
    }

    return (
      <Link
        key={lesson.id}
        href={`/courses/${courseId}/lessons/${lesson.id}`}
        className={cn(
          "group flex items-center gap-3 px-4 py-2.5 transition-all border-l-[3px] relative",
          isActive
            ? "bg-gradient-to-r from-orange-500/12 to-transparent border-l-[#d97757]"
            : isDone
            ? "border-l-transparent hover:bg-secondary/50"
            : "border-l-transparent hover:bg-secondary/40",
          !isLast && "border-b border-b-border/30"
        )}
      >
        {/* Status circle */}
        <div className={cn(
          "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all border",
          isDone
            ? "bg-emerald-500/20 border-emerald-400/30"
            : isActive
            ? "bg-orange-500/20 border-[#d97757]/40"
            : "bg-secondary border-border/40 group-hover:border-border"
        )}>
          {isDone ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : isActive ? (
            <div className="w-2 h-2 rounded-full bg-[#d97757] animate-pulse" />
          ) : (
            <span className="text-[10px] text-muted-foreground/50 font-semibold">{localIndex + 1}</span>
          )}
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-[13px] font-medium leading-snug truncate transition-colors",
            isActive  ? "text-foreground font-semibold"
            : isDone  ? "text-muted-foreground/60 line-through decoration-muted-foreground/30"
            : "text-muted-foreground group-hover:text-foreground/80"
          )}>
            {lesson.title}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium", cfg.bg, cfg.color)}>
              <LIcon className="w-2.5 h-2.5" />
              <span>{cfg.label}</span>
            </div>
            {lesson.duration ? (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/40">
                <Clock className="w-2.5 h-2.5" />
                {lesson.duration}m
              </span>
            ) : null}
            {lesson.type === "TEXT" && (
              <span className="text-muted-foreground/30" title="Audio mode available">
                <Headphones className="w-2.5 h-2.5" />
              </span>
            )}
            {lesson.isFree && !isEnrolled && (
              <span className="text-[9px] text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-full border border-emerald-400/20 font-medium">
                Free
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  };

  const listContent = (
    <div className="flex flex-col h-full">

      {/* ── Back to course ────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <Link
          href={`/courses/${courseId}`}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="font-medium truncate">{courseTitle}</span>
        </Link>
      </div>

      {/* ── Course stats ──────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-border flex-shrink-0 space-y-2.5">
        {/* Title row */}
        <div className="flex items-center justify-between gap-2">
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

          {/* Completion badge */}
          <div className="flex items-center gap-1.5">
            {completionPct === 100 && (
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className={cn(
              "text-xs font-semibold px-2.5 py-0.5 rounded-full",
              completionPct === 100
                ? "bg-amber-500/15 text-amber-400 border border-amber-400/20"
                : "bg-secondary text-muted-foreground/60"
            )}>
              {loading ? "…" : `${completionPct}%`}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-out",
              completionPct === 100
                ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                : "bg-gradient-to-r from-orange-600 to-orange-400"
            )}
            style={{ width: `${completionPct}%` }}
          />
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground/50">
          <span>{loading ? "…" : `${totalCompleted} of ${allLessons.length} lessons done`}</span>
          {remainingDuration > 0 && !loading && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(remainingDuration)} left
            </span>
          )}
        </div>
      </div>

      {/* ── Collapse / Expand all (sectioned courses only) ────────────────── */}
      {hasSections && (
        <div className="px-3 py-1.5 border-b border-border/40 flex-shrink-0">
          <button
            onClick={toggleAll}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors py-0.5 px-1"
          >
            {allOpen ? (
              <><ChevronsDownUp className="w-3 h-3" /> Collapse all</>
            ) : (
              <><ChevronsUpDown className="w-3 h-3" /> Expand all</>
            )}
          </button>
        </div>
      )}

      {/* ── Content list ──────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto min-h-0">
        {hasSections ? (
          <>
            {sections.map((section, sIdx) => {
              const isOpen           = openSections.has(section.id);
              const sectionCompleted = loading ? 0 : section.lessons.filter((l) => isCompleted(l.id)).length;
              const sectionTotal     = section.lessons.length;
              const sectionDone      = sectionCompleted === sectionTotal && sectionTotal > 0;
              const sectionPct       = sectionTotal > 0 ? Math.round((sectionCompleted / sectionTotal) * 100) : 0;
              const sectionDuration  = section.lessons.reduce((acc, l) => acc + (l.duration ?? 0), 0);
              const hasActiveLesson  = section.lessons.some((l) => l.id === currentLessonId);

              return (
                <div key={section.id} className="border-b border-border/50 last:border-b-0">
                  {/* Chapter header */}
                  <button
                    onClick={() => toggleSection(section.id)}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors text-left",
                      hasActiveLesson ? "bg-orange-500/5" : ""
                    )}
                  >
                    {/* Chapter number / done badge */}
                    <div className={cn(
                      "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border mt-0.5 transition-all",
                      sectionDone
                        ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-400"
                        : hasActiveLesson
                        ? "bg-orange-500/15 border-[#d97757]/30 text-[#d97757]"
                        : "bg-secondary border-border/50 text-muted-foreground/60"
                    )}>
                      {sectionDone ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        sIdx + 1
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Section title */}
                      <p className={cn(
                        "text-[13px] font-semibold leading-tight truncate",
                        sectionDone
                          ? "text-emerald-400/80"
                          : hasActiveLesson
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}>
                        {section.title}
                      </p>

                      {/* Meta: lessons · duration */}
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground/40">
                        <span>{sectionCompleted}/{sectionTotal} lessons</span>
                        {sectionDuration > 0 && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {formatDuration(sectionDuration)}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Per-chapter progress bar */}
                      {sectionTotal > 0 && (
                        <div className="mt-1.5 h-1 bg-secondary rounded-full overflow-hidden w-full">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              sectionDone
                                ? "bg-emerald-400/70"
                                : hasActiveLesson
                                ? "bg-[#d97757]/70"
                                : "bg-muted-foreground/20"
                            )}
                            style={{ width: `${sectionPct}%` }}
                          />
                        </div>
                      )}
                    </div>

                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-muted-foreground/40 flex-shrink-0 transition-transform duration-200 mt-1",
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
                        <div className="bg-background/40 border-t border-border/30">
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

            {ungroupedLessons.length > 0 && (
              <div>
                {ungroupedLessons.map((lesson, lIdx) =>
                  renderLesson(lesson, lIdx, lIdx === ungroupedLessons.length - 1)
                )}
              </div>
            )}
          </>
        ) : (
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
      <aside className="hidden lg:flex flex-col flex-shrink-0 w-72 xl:w-80 border-r border-border sticky top-16 h-[calc(100vh-4rem)] bg-card/60">
        {listContent}
      </aside>

      {/* ── Mobile: top bar + slide-down drawer ── */}
      <div className="lg:hidden fixed top-16 left-0 right-0 z-30 bg-card border-b border-border shadow-sm">
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Radial progress indicator */}
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
                  className={completionPct === 100 ? "text-amber-400" : "text-[#d97757]"}
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
                {(allLessons.findIndex((l) => l.id === currentLessonId) + 1)} of {allLessons.length}
                {" · "}
                {loading ? "…" : `${completionPct}% done`}
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
