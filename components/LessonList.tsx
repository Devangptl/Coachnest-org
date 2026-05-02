/**
 * LessonList — lesson list shown on the course detail page.
 * Supports both flat (legacy) and chapter-grouped (sections) display.
 */
"use client";

import { useState } from "react";
import {
  CheckCircle2, Circle, PlayCircle, FileText, HelpCircle,
  ChevronRight, ChevronDown, BookOpen, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Lesson {
  id: string;
  title: string;
  type: "TEXT" | "VIDEO" | "QUIZ";
  duration?: number | null;
  completed?: boolean;
  isFree?: boolean;
}

interface Section {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

interface LessonListProps {
  /** Flat list — used when course has no sections */
  lessons?: Lesson[];
  /** Chapter-based list */
  sections?: Section[];
  ungroupedLessons?: Lesson[];
  activeLessonId?: string;
  onSelectLesson?: (lessonId: string) => void;
}

const typeIcons = {
  VIDEO: PlayCircle,
  TEXT:  FileText,
  QUIZ:  HelpCircle,
};

const typeColors = {
  VIDEO: "text-[#d97757]",
  TEXT:  "text-blue-400",
  QUIZ:  "text-amber-400",
};

function LessonRow({
  lesson,
  index,
  isActive,
  onSelectLesson,
}: {
  lesson: Lesson;
  index: number;
  isActive: boolean;
  onSelectLesson?: (id: string) => void;
}) {
  const Icon  = typeIcons[lesson.type]  ?? FileText;
  const color = typeColors[lesson.type] ?? "text-blue-400";

  return (
    <button
      onClick={() => onSelectLesson?.(lesson.id)}
      className={cn(
        "flex items-center gap-3 p-3 rounded-md text-left transition-all w-full",
        isActive
          ? "bg-gradient-to-r from-orange-600/25 to-orange-500/15 border border-[#d97757]/25"
          : "hover:bg-secondary border border-transparent"
      )}
    >
      {/* Completion indicator */}
      <div className="flex-shrink-0">
        {lesson.completed ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        ) : (
          <Circle className={cn("w-5 h-5", isActive ? "text-[#d97757]" : "text-white/30")} />
        )}
      </div>

      {/* Lesson info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground/50 text-xs w-5 flex-shrink-0 font-medium">{index + 1}</span>
          <span className={cn("text-sm font-medium truncate", isActive ? "text-white" : "text-muted-foreground")}>
            {lesson.title}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 pl-7">
          <Icon className={cn("w-3 h-3", isActive ? "text-[#d97757]" : color)} />
          <span className="text-muted-foreground/60 text-xs">
            {lesson.type === "VIDEO"
              ? lesson.duration ? `${lesson.duration} min` : "Video"
              : lesson.type === "QUIZ" ? "Quiz"
              : "Reading"}
          </span>
          {lesson.isFree && !isActive && (
            <span className="text-[9px] text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-full border border-emerald-400/20 font-medium">
              Free
            </span>
          )}
        </div>
      </div>

      {isActive && <ChevronRight className="w-4 h-4 text-[#d97757] flex-shrink-0" />}
    </button>
  );
}

export default function LessonList({
  lessons,
  sections,
  ungroupedLessons,
  activeLessonId,
  onSelectLesson,
}: LessonListProps) {
  const hasSections = sections && sections.length > 0;

  // All section IDs open by default
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  function toggleSection(id: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ── Flat list (no sections) ────────────────────────────────────────────────
  if (!hasSections) {
    const flat = lessons ?? ungroupedLessons ?? [];
    return (
      <div className="flex flex-col gap-1">
        {flat.map((lesson, index) => (
          <LessonRow
            key={lesson.id}
            lesson={lesson}
            index={index}
            isActive={lesson.id === activeLessonId}
            onSelectLesson={onSelectLesson}
          />
        ))}
      </div>
    );
  }

  // ── Chapter-grouped list ───────────────────────────────────────────────────
  let globalIndex = 0;

  return (
    <div className="flex flex-col gap-2">
      {sections!.map((section, sIdx) => {
        const isCollapsed   = collapsedSections.has(section.id);
        const sectionCompleted = section.lessons.filter((l) => l.completed).length;
        const hasActiveInSection = section.lessons.some((l) => l.id === activeLessonId);
        const sectionDuration = section.lessons.reduce((acc, l) => acc + (l.duration ?? 0), 0);

        return (
          <div key={section.id} className="rounded-md border border-border/60 overflow-hidden">
            {/* Chapter header */}
            <button
              onClick={() => toggleSection(section.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50",
                hasActiveInSection ? "bg-orange-500/5" : "bg-secondary/20"
              )}
            >
              <div className={cn(
                "flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold border",
                hasActiveInSection
                  ? "bg-orange-500/15 border-[#d97757]/30 text-[#d97757]"
                  : "bg-secondary border-border/50 text-muted-foreground/50"
              )}>
                {sIdx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-semibold leading-tight truncate",
                  hasActiveInSection ? "text-foreground" : "text-muted-foreground"
                )}>
                  {section.title}
                </p>
                <p className="text-[11px] text-muted-foreground/50 mt-0.5 flex items-center gap-2">
                  <span>{sectionCompleted}/{section.lessons.length} lessons</span>
                  {sectionDuration > 0 && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {sectionDuration} min
                      </span>
                    </>
                  )}
                </p>
              </div>
              <ChevronDown className={cn(
                "w-4 h-4 text-muted-foreground/40 flex-shrink-0 transition-transform duration-200",
                isCollapsed ? "-rotate-90" : ""
              )} />
            </button>

            {/* Lessons */}
            {!isCollapsed && (
              <div className="px-2 py-1.5 space-y-0.5 border-t border-border/40 bg-background/30">
                {section.lessons.map((lesson) => {
                  const idx = globalIndex++;
                  return (
                    <LessonRow
                      key={lesson.id}
                      lesson={lesson}
                      index={idx}
                      isActive={lesson.id === activeLessonId}
                      onSelectLesson={onSelectLesson}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Ungrouped lessons (if any) */}
      {(ungroupedLessons ?? []).length > 0 && (
        <div className="flex flex-col gap-1 pt-1">
          <div className="flex items-center gap-2 px-2 py-1">
            <BookOpen className="w-3 h-3 text-muted-foreground/40" />
            <span className="text-[10px] text-muted-foreground/40 font-semibold uppercase tracking-wider">Other Lessons</span>
          </div>
          {(ungroupedLessons ?? []).map((lesson) => {
            const idx = globalIndex++;
            return (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                index={idx}
                isActive={lesson.id === activeLessonId}
                onSelectLesson={onSelectLesson}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
