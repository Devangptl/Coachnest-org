"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Lock, PlayCircle, FileText, HelpCircle,
  Clock, ArrowLeft, ChevronDown, X, Headphones,
  BookOpen, ChevronRight, LayoutList, Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLessonContext } from "./LessonProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Config ───────────────────────────────────────────────────────────────────

const typeConfig = {
  VIDEO: { icon: PlayCircle,  color: "text-[#d97757]",  bg: "bg-orange-500/10", label: "Video"   },
  TEXT:  { icon: FileText,    color: "text-blue-400",    bg: "bg-blue-500/10",   label: "Reading" },
  QUIZ:  { icon: HelpCircle,  color: "text-amber-400",   bg: "bg-amber-500/10",  label: "Quiz"    },
} as const;

function fmtDuration(min: number) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// ─── Lesson row ───────────────────────────────────────────────────────────────

function LessonRow({
  lesson,
  localIndex,
  isActive,
  isDone,
  isLocked,
  isLast,
  courseId,
  isEnrolled,
}: {
  lesson: Lesson;
  localIndex: number;
  isActive: boolean;
  isDone: boolean;
  isLocked: boolean;
  isLast: boolean;
  courseId: string;
  isEnrolled: boolean;
}) {
  const cfg   = typeConfig[lesson.type] ?? typeConfig.TEXT;
  const LIcon = cfg.icon;

  const statusNode = isLocked ? (
    <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-secondary/60 border border-border/40">
      <Lock className="w-3 h-3 text-muted-foreground/30" />
    </div>
  ) : isDone ? (
    <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-emerald-500/15 border border-emerald-400/25">
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
    </div>
  ) : isActive ? (
    <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-[#d97757]/15 border border-[#d97757]/30">
      <div className="w-2 h-2 rounded-full bg-[#d97757] animate-pulse" />
    </div>
  ) : (
    <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center border border-border/40 bg-secondary/30 group-hover:border-border/70 transition-colors">
      <span className="text-[10px] text-muted-foreground/50 font-semibold group-hover:text-muted-foreground/70 transition-colors">
        {localIndex + 1}
      </span>
    </div>
  );

  const content = (
    <>
      {statusNode}

      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-[12.5px] leading-snug truncate transition-colors",
          isLocked  ? "text-muted-foreground/35"
          : isActive  ? "text-foreground font-semibold"
          : isDone    ? "text-muted-foreground/55"
          : "text-muted-foreground/80 group-hover:text-foreground/80",
        )}>
          {lesson.title}
        </p>

        <div className="flex items-center gap-2 mt-0.5">
          {/* Type pill */}
          <span className={cn(
            "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
            cfg.bg, cfg.color,
          )}>
            <LIcon className="w-2.5 h-2.5" />
            {cfg.label}
          </span>

          {lesson.duration ? (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/40">
              <Clock className="w-2.5 h-2.5" />
              {lesson.duration}m
            </span>
          ) : null}

          {lesson.type === "TEXT" && !isLocked && (
            <Headphones className="w-2.5 h-2.5 text-muted-foreground/25" title="Audio available" />
          )}

          {lesson.isFree && !isEnrolled && !isLocked && (
            <span className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-400/20 px-1.5 py-0.5 rounded-full font-semibold">
              Free
            </span>
          )}
        </div>
      </div>

      {isActive && (
        <ChevronRight className="w-3.5 h-3.5 text-[#d97757]/60 flex-shrink-0" />
      )}
    </>
  );

  const rowCls = cn(
    "group flex items-center gap-3 px-4 py-3 transition-all duration-150 border-l-[3px] relative",
    isActive
      ? "bg-[#d97757]/[0.07] border-l-[#d97757]"
      : isDone
      ? "border-l-transparent hover:bg-secondary/30"
      : isLocked
      ? "border-l-transparent opacity-50 cursor-not-allowed"
      : "border-l-transparent hover:bg-secondary/40",
    !isLast && "border-b border-b-border/20",
  );

  if (isLocked) {
    return <div className={rowCls}>{content}</div>;
  }

  return (
    <Link href={`/courses/${courseId}/lessons/${lesson.id}`} className={rowCls}>
      {content}
    </Link>
  );
}

// ─── Chapter accordion ────────────────────────────────────────────────────────

function ChapterAccordion({
  section,
  sIdx,
  isOpen,
  toggle,
  courseId,
  currentLessonId,
  isEnrolled,
  isCompleted,
  loading,
  globalOffset,
}: {
  section: Section;
  sIdx: number;
  isOpen: boolean;
  toggle: () => void;
  courseId: string;
  currentLessonId: string;
  isEnrolled: boolean;
  isCompleted: (id: string) => boolean;
  loading: boolean;
  globalOffset: number;
}) {
  const completedCount  = loading ? 0 : section.lessons.filter((l) => isCompleted(l.id)).length;
  const total           = section.lessons.length;
  const sectionDone     = completedCount === total && total > 0;
  const pct             = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  const sectionDuration = section.lessons.reduce((a, l) => a + (l.duration ?? 0), 0);
  const hasActive       = section.lessons.some((l) => l.id === currentLessonId);

  return (
    <div className="border-b border-border/30 last:border-b-0">
      {/* ── Chapter header ─── */}
      <button
        onClick={toggle}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors",
          hasActive ? "bg-orange-500/[0.05]" : "hover:bg-secondary/30",
        )}
      >
        {/* Number / done badge */}
        <div className={cn(
          "flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold border transition-all",
          sectionDone
            ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-400"
            : hasActive
            ? "bg-[#d97757]/15 border-[#d97757]/30 text-[#d97757]"
            : "bg-secondary/60 border-border/50 text-muted-foreground/60",
        )}>
          {sectionDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : sIdx + 1}
        </div>

        <div className="flex-1 min-w-0 text-left">
          <p className={cn(
            "text-[12.5px] font-semibold leading-tight truncate",
            sectionDone ? "text-emerald-400/80"
            : hasActive  ? "text-foreground"
            :              "text-muted-foreground/80",
          )}>
            {section.title}
          </p>

          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground/40">
            <span>{completedCount}/{total} lessons</span>
            {sectionDuration > 0 && (
              <>
                <span>·</span>
                <span className="flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {fmtDuration(sectionDuration)}
                </span>
              </>
            )}
          </div>

          {/* Per-chapter progress bar */}
          {total > 0 && (
            <div className="mt-1.5 h-0.5 rounded-full bg-border/30 overflow-hidden w-full">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  sectionDone ? "bg-emerald-400/60"
                  : hasActive  ? "bg-[#d97757]/60"
                  :              "bg-muted-foreground/20",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </div>

        <ChevronDown className={cn(
          "flex-shrink-0 w-3.5 h-3.5 text-muted-foreground/35 transition-transform duration-200",
          isOpen ? "rotate-0" : "-rotate-90",
        )} />
      </button>

      {/* ── Lessons ─── */}
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
            <div className="bg-background/20">
              {section.lessons.map((lesson, lIdx) => (
                <LessonRow
                  key={lesson.id}
                  lesson={lesson}
                  localIndex={globalOffset + lIdx}
                  isActive={lesson.id === currentLessonId}
                  isDone={!loading && isCompleted(lesson.id)}
                  isLocked={!loading && !isEnrolled && !lesson.isFree}
                  isLast={lIdx === section.lessons.length - 1}
                  courseId={courseId}
                  isEnrolled={isEnrolled}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main sidebar ─────────────────────────────────────────────────────────────

export default function LessonSidebar({ courseId, courseTitle, sections, ungroupedLessons }: Props) {
  const { isEnrolled, loading, isCompleted, mobileSidebarOpen, setMobileSidebarOpen } = useLessonContext();
  const pathname = usePathname();

  const currentLessonId = pathname.split(`/courses/${courseId}/lessons/`)[1]?.split("/")[0] ?? "";

  const allLessons = useMemo(
    () => [...sections.flatMap((s) => s.lessons), ...ungroupedLessons],
    [sections, ungroupedLessons],
  );

  const hasSections = sections.length > 0;

  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(sections.map((s) => s.id)),
  );

  // Auto-open section with active lesson
  useEffect(() => {
    for (const s of sections) {
      if (s.lessons.some((l) => l.id === currentLessonId)) {
        setOpenSections((prev) => prev.has(s.id) ? prev : new Set([...prev, s.id]));
        break;
      }
    }
  }, [currentLessonId, sections]);

  // Close mobile drawer on navigation
  useEffect(() => { setMobileSidebarOpen(false); }, [currentLessonId, setMobileSidebarOpen]);

  const totalCompleted  = loading ? 0 : allLessons.filter((l) => isCompleted(l.id)).length;
  const completionPct   = allLessons.length > 0 && !loading
    ? Math.round((totalCompleted / allLessons.length) * 100) : 0;
  const totalDuration   = useMemo(() => allLessons.reduce((a, l) => a + (l.duration ?? 0), 0), [allLessons]);
  const doneDuration    = useMemo(
    () => loading ? 0 : allLessons.filter((l) => isCompleted(l.id)).reduce((a, l) => a + (l.duration ?? 0), 0),
    [allLessons, loading, isCompleted],
  );
  const remainingMins   = Math.max(0, totalDuration - doneDuration);
  const courseComplete  = completionPct === 100 && !loading && allLessons.length > 0;

  const allOpen   = openSections.size === sections.length;
  const toggleAll = () => setOpenSections(
    allOpen ? new Set() : new Set(sections.map((s) => s.id)),
  );
  const toggleSection = (id: string) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Running global lesson index offset per section (for sequential numbering)
  let globalOffset = 0;

  // ── Sidebar body ─────────────────────────────────────────────────────────────

  const sidebarBody = (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Back navigation ───────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3">
        <Link
          href={`/courses/${courseId}`}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/60 hover:text-muted-foreground transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to course
        </Link>
        <h2 className="mt-1.5 text-[13px] font-semibold text-foreground/90 leading-tight line-clamp-2">
          {courseTitle}
        </h2>
      </div>

      {/* ── Progress card ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 mx-3 mb-3 rounded-xl border border-border/50 bg-secondary/20 p-3.5 space-y-3">
        {/* Top row: label + badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {hasSections
              ? <BookOpen className="w-3.5 h-3.5 text-[#d97757]" />
              : <LayoutList className="w-3.5 h-3.5 text-[#d97757]" />
            }
            <span className="text-[12px] font-semibold text-foreground/80">
              {hasSections
                ? `${sections.length} Chapter${sections.length !== 1 ? "s" : ""}`
                : "Lessons"}
            </span>
          </div>

          <div className={cn(
            "flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border",
            courseComplete
              ? "bg-amber-500/10 border-amber-400/25 text-amber-400"
              : "bg-secondary border-border/50 text-muted-foreground/60",
          )}>
            {courseComplete && <Trophy className="w-3 h-3" />}
            {loading ? "—" : `${completionPct}%`}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-border/30 overflow-hidden">
          <motion.div
            className={cn(
              "h-full rounded-full",
              courseComplete
                ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                : "bg-gradient-to-r from-[#d97757] to-orange-400",
            )}
            initial={{ width: 0 }}
            animate={{ width: `${completionPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between text-[10.5px] text-muted-foreground/50">
          <span>
            {loading ? "…" : `${totalCompleted} / ${allLessons.length} lessons`}
          </span>
          {remainingMins > 0 && !loading && (
            <span className="flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {fmtDuration(remainingMins)} left
            </span>
          )}
          {courseComplete && (
            <span className="text-amber-400 font-semibold">Complete!</span>
          )}
        </div>
      </div>

      {/* ── Collapse / expand all (sectioned only) ────────────────────────── */}
      {hasSections && (
        <div className="flex-shrink-0 flex items-center justify-between px-4 pb-2">
          <span className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-wider">
            Contents
          </span>
          <button
            onClick={toggleAll}
            className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors font-medium"
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        </div>
      )}

      {/* ── Chapter + lesson list ──────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto min-h-0 border-t border-border/30">
        {hasSections ? (
          <>
            {sections.map((section, sIdx) => {
              const offset = globalOffset;
              globalOffset += section.lessons.length;
              return (
                <ChapterAccordion
                  key={section.id}
                  section={section}
                  sIdx={sIdx}
                  isOpen={openSections.has(section.id)}
                  toggle={() => toggleSection(section.id)}
                  courseId={courseId}
                  currentLessonId={currentLessonId}
                  isEnrolled={isEnrolled}
                  isCompleted={isCompleted}
                  loading={loading}
                  globalOffset={offset}
                />
              );
            })}
            {ungroupedLessons.length > 0 && (
              <div className="border-t border-border/30 pt-1 pb-2">
                <p className="px-4 py-2 text-[10px] font-semibold text-muted-foreground/35 uppercase tracking-wider">
                  Other Lessons
                </p>
                {ungroupedLessons.map((lesson, i) => (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    localIndex={globalOffset + i}
                    isActive={lesson.id === currentLessonId}
                    isDone={!loading && isCompleted(lesson.id)}
                    isLocked={!loading && !isEnrolled && !lesson.isFree}
                    isLast={i === ungroupedLessons.length - 1}
                    courseId={courseId}
                    isEnrolled={isEnrolled}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          allLessons.map((lesson, i) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              localIndex={i}
              isActive={lesson.id === currentLessonId}
              isDone={!loading && isCompleted(lesson.id)}
              isLocked={!loading && !isEnrolled && !lesson.isFree}
              isLast={i === allLessons.length - 1}
              courseId={courseId}
              isEnrolled={isEnrolled}
            />
          ))
        )}

        {/* Bottom padding */}
        <div className="h-4" />
      </nav>

      {/* ── Keyboard hint ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 hidden lg:flex items-center justify-center gap-1.5 px-4 py-2.5 border-t border-border/30 bg-background/30">
        <kbd className="text-[9px] text-muted-foreground/30 bg-secondary/60 border border-border/40 rounded px-1 py-0.5 font-mono">←</kbd>
        <kbd className="text-[9px] text-muted-foreground/30 bg-secondary/60 border border-border/40 rounded px-1 py-0.5 font-mono">→</kbd>
        <span className="text-[10px] text-muted-foreground/25 ml-0.5">navigate lessons</span>
      </div>
    </div>
  );

  // ── Mobile top-bar ────────────────────────────────────────────────────────

  const currentLesson = allLessons.find((l) => l.id === currentLessonId);
  const currentIndex  = allLessons.findIndex((l) => l.id === currentLessonId);

  return (
    <>
      {/* Desktop sticky sidebar */}
      <aside className="hidden lg:flex flex-col flex-shrink-0 w-[17rem] xl:w-[18.5rem] border-r border-border/60 sticky top-16 h-[calc(100vh-4rem)] bg-card/70 backdrop-blur-sm">
        {sidebarBody}
      </aside>

      {/* Mobile: fixed top bar + animated drawer */}
      <div className="lg:hidden fixed top-16 inset-x-0 z-30">
        {/* Bar */}
        <div className="bg-card/95 backdrop-blur border-b border-border/60 shadow-sm">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="flex w-full items-center gap-3 px-4 py-3"
          >
            {/* Radial progress */}
            <div className="relative flex-shrink-0">
              <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2.5"
                  className="text-secondary" />
                <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2.5"
                  className={courseComplete ? "text-amber-400" : "text-[#d97757]"}
                  strokeDasharray={`${(completionPct / 100) * 81.7} 81.7`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-foreground/70">
                {loading ? "…" : `${completionPct}%`}
              </span>
            </div>

            <div className="flex-1 min-w-0 text-left">
              <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
                {currentLesson?.title ?? "Lessons"}
              </p>
              <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                {currentIndex >= 0 ? `${currentIndex + 1} of ${allLessons.length}` : allLessons.length + " lessons"}
                {" · "}
                {loading ? "…" : `${totalCompleted} done`}
              </p>
            </div>

            {mobileSidebarOpen
              ? <X className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
            }
          </button>
        </div>

        {/* Drawer */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden border-b border-border/60 shadow-xl bg-card/95 backdrop-blur"
            >
              <div className="max-h-[65vh] overflow-y-auto">
                {sidebarBody}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
