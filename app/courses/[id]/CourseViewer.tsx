"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Lock,
  PlayCircle,
  FileText,
  HelpCircle,
  Clock,
  Eye,
  LayoutList,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  VIDEO: { icon: PlayCircle, color: "text-orange-400", bg: "bg-orange-500/15", border: "border-orange-400/20", label: "Video" },
  TEXT:  { icon: FileText,   color: "text-blue-400",   bg: "bg-blue-500/15",   border: "border-blue-400/20",   label: "Reading" },
  QUIZ:  { icon: HelpCircle, color: "text-amber-400",  bg: "bg-amber-500/15",  border: "border-amber-400/20",  label: "Quiz" },
};

export default function CourseViewer({ courseId, lessons, isEnrolled }: Props) {
  const completedCount = lessons.filter((l) => l.completed).length;

  if (lessons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <BookOpen className="w-12 h-12 text-muted-foreground/20 mb-4" />
        <p className="text-muted-foreground/60 text-lg">No lessons yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <LayoutList className="w-4 h-4 text-orange-400" />
          <span className="font-semibold text-foreground text-sm">Course Lessons</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground/60 bg-secondary px-2.5 py-1 rounded-full">
            {completedCount}/{lessons.length} done
          </span>
          {isEnrolled && (
            <Link
              href={`/courses/${courseId}/lessons/${(() => {
                const firstIncomplete = lessons.find((l) => !l.completed);
                return (firstIncomplete ?? lessons[0]).id;
              })()}`}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-orange-500/10 hover:bg-orange-500/20 border border-orange-400/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              Continue
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-secondary">
        <div
          className="h-full bg-gradient-to-r from-orange-600 to-orange-500 transition-all duration-500"
          style={{ width: `${lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0}%` }}
        />
      </div>

      {/* Lesson list */}
      <div>
        {lessons.map((lesson, i) => {
          const isLocked = !isEnrolled && !lesson.isFree;
          const isDone = lesson.completed;
          const config = typeConfig[lesson.type] ?? typeConfig.TEXT;
          const Icon = config.icon;

          if (isLocked) {
            return (
              <div
                key={lesson.id}
                className={cn(
                  "flex items-center gap-4 px-5 py-4 opacity-50 cursor-not-allowed",
                  i !== lessons.length - 1 && "border-b border-border/50"
                )}
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-white/[0.04]">
                  <Lock className="w-4 h-4 text-muted-foreground/30" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground truncate">{lesson.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Icon className={cn("w-3 h-3", config.color)} />
                    <span className={cn("text-[10px] font-medium", config.color)}>{config.label}</span>
                    {lesson.duration && (
                      <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {lesson.duration}m
                      </span>
                    )}
                  </div>
                </div>
                <span className="flex-shrink-0 text-[10px] text-muted-foreground/40 font-medium">{i + 1}</span>
              </div>
            );
          }

          return (
            <Link
              key={lesson.id}
              href={`/courses/${courseId}/lessons/${lesson.id}`}
              className={cn(
                "flex items-center gap-4 px-5 py-4 hover:bg-secondary/50 transition-colors group",
                i !== lessons.length - 1 && "border-b border-border/50"
              )}
            >
              {/* Status icon */}
              <div className={cn(
                "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center border",
                isDone
                  ? "bg-emerald-500/15 border-emerald-400/20"
                  : "bg-white/[0.04] border-white/[0.06] group-hover:border-orange-400/20 group-hover:bg-orange-500/10"
              )}>
                {isDone ? (
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
                ) : (
                  <Icon className={cn("w-4 h-4", config.color)} />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-medium truncate",
                  isDone ? "text-emerald-600 dark:text-emerald-300/80" : "text-foreground"
                )}>
                  {lesson.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn("text-[10px] font-medium", config.color)}>{config.label}</span>
                  {lesson.duration && (
                    <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {lesson.duration}m
                    </span>
                  )}
                  {lesson.isFree && !isEnrolled && (
                    <span className="flex items-center gap-0.5 text-[9px] text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-full border border-emerald-400/20 font-medium">
                      <Eye className="w-2 h-2" /> Free
                    </span>
                  )}
                </div>
              </div>

              {/* Lesson number + arrow */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[11px] text-muted-foreground/40 font-medium">{i + 1}</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
