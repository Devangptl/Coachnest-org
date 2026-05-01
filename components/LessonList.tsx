/**
 * LessonList — ordered list of lessons shown on the course detail page.
 * Highlights completed lessons and the current active one.
 */
"use client";

import { useState } from "react";
import { CheckCircle2, Circle, PlayCircle, FileText, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Lesson {
  id: string;
  title: string;
  type: "TEXT" | "VIDEO" | "QUIZ";
  duration?: number | null;
  completed?: boolean;
}

interface LessonListProps {
  lessons: Lesson[];
  /** ID of the currently viewed lesson */
  activeLessonId?: string;
  onSelectLesson?: (lessonId: string) => void;
}

export default function LessonList({
  lessons,
  activeLessonId,
  onSelectLesson,
}: LessonListProps) {
  return (
    <div className="flex flex-col gap-1">
      {lessons.map((lesson, index) => {
        const isActive = lesson.id === activeLessonId;
        const Icon = lesson.type === "VIDEO" ? PlayCircle : FileText;

        return (
          <button
            key={lesson.id}
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
                <Circle
                  className={cn(
                    "w-5 h-5",
                    isActive ? "text-[#d97757]" : "text-white/30"
                  )}
                />
              )}
            </div>

            {/* Lesson info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground/70 text-xs w-5 flex-shrink-0">
                  {index + 1}
                </span>
                <span
                  className={cn(
                    "text-sm font-medium truncate",
                    isActive ? "text-white" : "text-muted-foreground"
                  )}
                >
                  {lesson.title}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 pl-7">
                <Icon
                  className={cn(
                    "w-3 h-3",
                    isActive ? "text-[#d97757]" : "text-white/30"
                  )}
                />
                <span className="text-muted-foreground/70 text-xs">
                  {lesson.type === "VIDEO"
                    ? lesson.duration
                      ? `${lesson.duration} min`
                      : "Video"
                    : "Reading"}
                </span>
              </div>
            </div>

            {isActive && (
              <ChevronRight className="w-4 h-4 text-[#d97757] flex-shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
}
