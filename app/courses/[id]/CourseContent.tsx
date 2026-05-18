"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CourseTabs from "./CourseTabs";
import CourseViewer from "./CourseViewer";
import ReviewsSection from "./ReviewsSection";
import Link from "next/link";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import {
  CheckCircle2,
  Circle,
  PlayCircle,
  FileText,
  Clock,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Target,
  Zap,
  Lock,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Lesson {
  id: string;
  title: string;
  type: "TEXT" | "VIDEO" | "QUIZ";
  content?: string | null;
  description?: string | null;
  duration?: number | null;
  isFree?: boolean;
  completed: boolean;
}

interface SectionWithLessons {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

interface Props {
  courseId: string;
  description: string;
  lessons: Lesson[];
  sections?: SectionWithLessons[];
  ungroupedLessons?: Lesson[];
  isEnrolled: boolean;
  isLoggedIn: boolean;
  reviewCount: number;
}

export default function CourseContent({
  courseId,
  description,
  lessons,
  sections,
  ungroupedLessons,
  isEnrolled,
  isLoggedIn,
  reviewCount,
}: Props) {
  const [activeTab, setActiveTab] = useState(isEnrolled ? "curriculum" : "overview");

  // Auto-switch to curriculum when Access Now enrollment completes
  useEffect(() => {
    function onOpenCurriculum() { setActiveTab("curriculum"); }
    window.addEventListener("course:open-curriculum", onOpenCurriculum);
    return () => window.removeEventListener("course:open-curriculum", onOpenCurriculum);
  }, []);

  // Live completion state — shared between progress bar, viewer, and overview
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>(
    () => Object.fromEntries(lessons.map((l) => [l.id, l.completed]))
  );
  const completedCount = Object.values(completedMap).filter(Boolean).length;

  // Callback for CourseViewer to notify completion changes
  function handleCompletionChange(lessonId: string, value: boolean) {
    setCompletedMap((prev) => ({ ...prev, [lessonId]: value }));
  }

  // Derive lessons with live completion status
  const liveLessons = lessons.map((l) => ({ ...l, completed: completedMap[l.id] ?? l.completed }));

  // Chapter-aware live views
  const liveSections = sections?.map((s) => ({
    ...s,
    lessons: s.lessons.map((l) => ({ ...l, completed: completedMap[l.id] ?? l.completed })),
  }));
  const liveUngrouped = ungroupedLessons?.map((l) => ({ ...l, completed: completedMap[l.id] ?? l.completed }));

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Floating bottom tab bar */}
      <CourseTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        reviewCount={reviewCount}
        lessonCount={lessons.length}
      />

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {/* About this course */}
            <div className="bg-secondary border border-border rounded-md p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-[#d97757]" />
                About This Course
              </h2>
              <MarkdownRenderer content={description} compact />
            </div>

            {/* What you'll learn */}
            <div className="bg-secondary border border-border rounded-md p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-400" />
                What You&apos;ll Learn
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {lessons.slice(0, 8).map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex items-start gap-2.5 text-muted-foreground text-sm"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>{lesson.title}</span>
                  </div>
                ))}
                {lessons.length > 8 && (
                  <div className="flex items-center gap-2 text-[#d97757] text-sm">
                    <Zap className="w-4 h-4" />
                    And {lessons.length - 8} more topics...
                  </div>
                )}
              </div>
            </div>

            {/* Quick curriculum preview */}
            <div className="bg-secondary border border-border rounded-md p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-1 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                Course Content
              </h2>
              <p className="text-muted-foreground/70 text-sm mb-4">
                {lessons.length} lessons &middot;{" "}
                {(() => {
                  const mins = lessons.reduce((s, l) => s + (l.duration ?? 0), 0);
                  return mins > 60
                    ? `${Math.floor(mins / 60)}h ${mins % 60}m`
                    : `${mins}m`;
                })()}{" "}
                total
              </p>
              <CurriculumPreview
                lessons={liveLessons}
                sections={liveSections}
                ungroupedLessons={liveUngrouped}
                courseId={courseId}
                isEnrolled={isEnrolled}
              />
            </div>
          </motion.div>
        )}

        {activeTab === "curriculum" && (
          <motion.div
            key="curriculum"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <CourseViewer
              courseId={courseId}
              lessons={liveLessons}
              sections={liveSections}
              ungroupedLessons={liveUngrouped}
              isEnrolled={isEnrolled}
              onCompletionChange={handleCompletionChange}
            />
          </motion.div>
        )}

        {activeTab === "reviews" && (
          <motion.div
            key="reviews"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <ReviewsSection
              courseId={courseId}
              isEnrolled={isEnrolled}
              isLoggedIn={isLoggedIn}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Curriculum preview (collapsible lesson list) ────────────────── */
function CurriculumPreview({
  lessons,
  sections,
  ungroupedLessons,
  courseId,
  isEnrolled,
}: {
  lessons: Lesson[];
  sections?: SectionWithLessons[];
  ungroupedLessons?: Lesson[];
  courseId: string;
  isEnrolled: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const hasSections = sections && sections.length > 0;

  function toggleSection(id: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ── Chapter-grouped preview ────────────────────────────────────────
  if (hasSections) {
    const allSectionLessons = sections.flatMap((s) => s.lessons);
    const allLessonsForCount = [...allSectionLessons, ...(ungroupedLessons ?? [])];
    const PREVIEW_SECTIONS = 3;
    const visibleSections = expanded ? sections : sections.slice(0, PREVIEW_SECTIONS);
    let globalIdx = 0;

    return (
      <div className="space-y-1.5">
        {visibleSections.map((section, sIdx) => {
          const isCollapsed = collapsedSections.has(section.id);
          const sectionDuration = section.lessons.reduce((acc, l) => acc + (l.duration ?? 0), 0);
          const completedInSection = section.lessons.filter((l) => l.completed).length;

          return (
            <div key={section.id} className="rounded-md border border-border/60 overflow-hidden">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-secondary/50 transition-colors bg-secondary/20"
              >
                <div className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold bg-secondary border border-border/50 text-muted-foreground/50">
                  {sIdx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-muted-foreground truncate">{section.title}</p>
                  <p className="text-[10px] text-muted-foreground/50 flex items-center gap-1.5 mt-0.5">
                    <span>{completedInSection}/{section.lessons.length} lessons</span>
                    {sectionDuration > 0 && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />{sectionDuration}m
                        </span>
                      </>
                    )}
                  </p>
                </div>
                {isCollapsed
                  ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                  : <ChevronDown  className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                }
              </button>

              {!isCollapsed && (
                <div className="px-2 py-1 space-y-0.5 border-t border-border/40 bg-background/20">
                  {section.lessons.map((lesson) => {
                    const idx = globalIdx++;
                    return (
                      <LessonPreviewRow
                        key={lesson.id}
                        lesson={lesson}
                        index={idx}
                        courseId={courseId}
                        isEnrolled={isEnrolled}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Ungrouped lessons */}
        {(ungroupedLessons ?? []).length > 0 && expanded && (
          <div className="rounded-md border border-border/60 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-secondary/20 border-b border-border/40">
              <BookOpen className="w-3 h-3 text-muted-foreground/40" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">Other Lessons</span>
            </div>
            <div className="px-2 py-1 space-y-0.5 bg-background/20">
              {(ungroupedLessons ?? []).map((lesson) => {
                const idx = globalIdx++;
                return (
                  <LessonPreviewRow
                    key={lesson.id}
                    lesson={lesson}
                    index={idx}
                    courseId={courseId}
                    isEnrolled={isEnrolled}
                  />
                );
              })}
            </div>
          </div>
        )}

        {(sections.length > PREVIEW_SECTIONS || (ungroupedLessons ?? []).length > 0) && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-2 text-[#d97757] hover:text-orange-300 text-sm px-3 py-2 transition-colors w-full"
          >
            <ChevronDown className={cn("w-4 h-4 transition-transform", expanded && "rotate-180")} />
            {expanded
              ? "Show less"
              : `Show all ${sections.length} chapters · ${allLessonsForCount.length} lessons`}
          </button>
        )}
      </div>
    );
  }

  // ── Flat list (no chapters) ────────────────────────────────────────
  const visible = expanded ? lessons : lessons.slice(0, 5);
  let flatIdx = 0;

  return (
    <div className="space-y-1">
      {visible.map((lesson) => (
        <LessonPreviewRow
          key={lesson.id}
          lesson={lesson}
          index={flatIdx++}
          courseId={courseId}
          isEnrolled={isEnrolled}
        />
      ))}

      {lessons.length > 5 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-2 text-[#d97757] hover:text-orange-300 text-sm px-3 py-2 transition-colors w-full"
        >
          <ChevronDown className={cn("w-4 h-4 transition-transform", expanded && "rotate-180")} />
          {expanded ? "Show less" : `Show all ${lessons.length} lessons`}
        </button>
      )}
    </div>
  );
}

function LessonPreviewRow({
  lesson,
  index,
  courseId,
  isEnrolled,
}: {
  lesson: Lesson;
  index: number;
  courseId: string;
  isEnrolled: boolean;
}) {
  const Icon = lesson.type === "VIDEO" ? PlayCircle : FileText;
  const isLocked = !isEnrolled && !lesson.isFree;

  const inner = (
    <>
      <span className="text-muted-foreground/40 text-xs w-5 text-right flex-shrink-0">{index + 1}</span>
      {lesson.completed ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
      ) : isLocked ? (
        <Lock className="w-4 h-4 text-muted-foreground/25 flex-shrink-0" />
      ) : (
        <Circle className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
      )}
      <Icon className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
      <span className={cn("text-sm flex-1 truncate", lesson.completed ? "text-emerald-600 dark:text-emerald-300/80" : "text-muted-foreground")}>
        {lesson.title}
      </span>
      {lesson.isFree && !isEnrolled && (
        <span className="text-[10px] text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-full border border-emerald-400/20">
          Free
        </span>
      )}
      {lesson.duration && (
        <span className="text-muted-foreground/50 text-xs flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {lesson.duration}m
        </span>
      )}
    </>
  );

  if (isLocked) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-md opacity-50">
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={`/courses/${courseId}/lessons/${lesson.id}`}
      className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-secondary transition-colors group"
    >
      {inner}
    </Link>
  );
}
