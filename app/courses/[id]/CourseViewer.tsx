"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  lessons: Lesson[];
  isEnrolled: boolean;
  onCompletionChange?: (lessonId: string, completed: boolean) => void;
}

const typeConfig = {
  VIDEO: { icon: PlayCircle, color: "text-purple-400", bg: "bg-purple-500/15", border: "border-purple-400/20", label: "Video Lesson" },
  TEXT:  { icon: FileText, color: "text-blue-400", bg: "bg-blue-500/15", border: "border-blue-400/20", label: "Text Lesson" },
  QUIZ:  { icon: HelpCircle, color: "text-amber-400", bg: "bg-amber-500/15", border: "border-amber-400/20", label: "Quiz" },
};

export default function CourseViewer({ lessons, isEnrolled, onCompletionChange }: Props) {
  const [activeLessonId, setActiveLessonId] = useState<string>(
    lessons[0]?.id ?? ""
  );
  const [completed, setCompleted] = useState<Record<string, boolean>>(
    Object.fromEntries(lessons.map((l) => [l.id, l.completed]))
  );
  const [marking, setMarking] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  const activeLesson = lessons.find((l) => l.id === activeLessonId);
  const activeIndex = lessons.findIndex((l) => l.id === activeLessonId);
  const prev = lessons[activeIndex - 1];
  const next = lessons[activeIndex + 1];
  const completedCount = Object.values(completed).filter(Boolean).length;

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
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prev, next, selectLesson]);

  return (
    <div ref={contentRef} className="flex flex-col lg:flex-row gap-0 lg:gap-0 rounded-2xl overflow-hidden border border-white/10 backdrop-blur-md bg-white/[0.03]">
      {/* ── Left: Lesson sidebar (desktop persistent, mobile toggle) ── */}
      <div className={cn(
        "lg:w-[300px] flex-shrink-0 border-r border-white/10 bg-white/[0.02]",
        "lg:block",
        showSidebar ? "block" : "hidden lg:block"
      )}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <LayoutList className="w-4 h-4 text-purple-400" />
            <span className="text-white font-semibold text-sm">Lessons</span>
          </div>
          <span className="text-xs text-white/30 bg-white/5 px-2.5 py-1 rounded-full">
            {completedCount}/{lessons.length}
          </span>
        </div>

        {/* Mini progress bar */}
        <div className="h-1 bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
            style={{ width: `${lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0}%` }}
          />
        </div>

        {/* Lesson list */}
        <div className="max-h-[500px] lg:max-h-[600px] overflow-y-auto">
          {lessons.map((lesson, i) => {
            const isActive = lesson.id === activeLessonId;
            const isCompleted = completed[lesson.id];
            const config = typeConfig[lesson.type] ?? typeConfig.TEXT;
            const Icon = config.icon;

            return (
              <button
                key={lesson.id}
                onClick={() => {
                  selectLesson(lesson.id);
                  setShowSidebar(false);
                }}
                className={cn(
                  "flex items-center gap-3 w-full px-5 py-3.5 text-left transition-all",
                  isActive
                    ? "bg-purple-500/10 border-l-[3px] border-l-purple-500"
                    : "border-l-[3px] border-l-transparent hover:bg-white/[0.04]",
                  i !== lessons.length - 1 && "border-b border-b-white/[0.04]"
                )}
              >
                {/* Number / status */}
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs",
                  isCompleted
                    ? "bg-emerald-500/20"
                    : isActive
                    ? "bg-purple-500/20 border border-purple-400/30"
                    : "bg-white/[0.04]"
                )}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isActive ? (
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
                  ) : (
                    <span className="text-xs text-white/30 font-medium">{i + 1}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-xs font-medium leading-tight mb-0.5 truncate",
                    isActive ? "text-white" : isCompleted ? "text-emerald-300/80" : "text-white/70"
                  )}>
                    {lesson.title}
                  </p>
                  <div className="flex items-center gap-2">
                    <Icon className={cn("w-3 h-3", config.color)} />
                    <span className={cn("text-[10px] font-medium", config.color)}>
                      {config.label}
                    </span>
                    {lesson.duration && (
                      <span className="text-[10px] text-white/25 flex items-center gap-0.5">
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
      </div>

      {/* ── Mobile toggle ── */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="lg:hidden flex items-center justify-between gap-3 px-5 py-3 bg-white/[0.03] border-b border-white/10"
      >
        <div className="flex items-center gap-2 text-sm">
          <LayoutList className="w-4 h-4 text-purple-400" />
          <span className="text-white/50 truncate">
            {activeIndex + 1}. {activeLesson?.title ?? "Select lesson"}
          </span>
        </div>
        <ChevronDown className={cn(
          "w-4 h-4 text-white/40 transition-transform",
          showSidebar && "rotate-180"
        )} />
      </button>

      {/* ── Right: Content area ── */}
      <div className="flex-1 min-w-0">
        {!isEnrolled ? (
          <div className="flex flex-col items-center justify-center py-28 px-6 text-center">
            <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
              <Lock className="w-12 h-12 text-white/15" />
            </div>
            <h3 className="text-white text-2xl font-bold mb-3">
              Enroll to Access Content
            </h3>
            <p className="text-white/40 text-base max-w-md leading-relaxed">
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 sm:px-8 py-5 border-b border-white/10">
                <div className="flex items-center gap-4 min-w-0">
                  {/* Type icon */}
                  {(() => {
                    const config = typeConfig[activeLesson.type] ?? typeConfig.TEXT;
                    const Icon = config.icon;
                    return (
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border",
                        config.bg, config.border
                      )}>
                        <Icon className={cn("w-6 h-6", config.color)} />
                      </div>
                    );
                  })()}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white/30 text-xs font-medium">
                        Lesson {activeIndex + 1} of {lessons.length}
                      </span>
                      {activeLesson.isFree && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-400/20 font-medium">
                          <Eye className="w-2.5 h-2.5" />
                          Free Preview
                        </span>
                      )}
                      {activeLesson.duration && (
                        <span className="flex items-center gap-1 text-[10px] text-white/25">
                          <Clock className="w-2.5 h-2.5" />
                          {activeLesson.duration} min
                        </span>
                      )}
                    </div>
                    <h2 className="text-white font-bold text-lg sm:text-xl leading-tight">
                      {activeLesson.title}
                    </h2>
                  </div>
                </div>

                {/* Mark complete */}
                <button
                  onClick={() => toggleComplete(activeLesson.id)}
                  disabled={marking}
                  className={cn(
                    "flex items-center gap-2 text-sm px-5 py-2.5 rounded-xl border transition-all flex-shrink-0 font-semibold",
                    completed[activeLesson.id]
                      ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-400"
                      : "bg-white/5 border-white/15 text-white/50 hover:text-white hover:bg-white/10"
                  )}
                >
                  {completed[activeLesson.id] ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    >
                      <CheckCircle2 className="w-4.5 h-4.5" />
                    </motion.div>
                  ) : (
                    <Circle className="w-4.5 h-4.5" />
                  )}
                  {completed[activeLesson.id] ? "Completed" : "Mark Complete"}
                </button>
              </div>

              {/* Content body */}
              <div className="px-6 sm:px-8 py-6 sm:py-8">
                {activeLesson.type === "VIDEO" && activeLesson.content ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black/60 border border-white/5 shadow-xl shadow-black/30">
                    <iframe
                      src={activeLesson.content}
                      title={activeLesson.title}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : activeLesson.content ? (
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-6 sm:px-10 py-8 sm:py-10">
                    <div className="max-w-3xl mx-auto text-white/85 text-base sm:text-lg leading-[2] whitespace-pre-wrap font-sans tracking-wide first-letter:text-4xl first-letter:font-bold first-letter:text-purple-400 first-letter:mr-1 first-letter:float-left first-letter:leading-[0.8]">
                      {activeLesson.content}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-6 py-16 text-center">
                    <FileText className="w-14 h-14 text-white/10 mx-auto mb-4" />
                    <p className="text-white/30 text-base">No content added yet.</p>
                    <p className="text-white/20 text-sm mt-1">Content will appear here once the instructor adds it.</p>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-8 pt-6 border-t border-white/10">
                  {prev ? (
                    <button
                      onClick={() => selectLesson(prev.id)}
                      className="flex items-center gap-3 text-white/50 hover:text-white transition-colors group px-4 py-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10"
                    >
                      <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-white/10 transition-colors">
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] text-white/25 mb-0.5 font-medium uppercase tracking-wide">Previous</p>
                        <p className="text-sm font-semibold truncate max-w-[180px]">{prev.title}</p>
                      </div>
                    </button>
                  ) : (
                    <span />
                  )}
                  {next ? (
                    <button
                      onClick={() => selectLesson(next.id)}
                      className="flex items-center gap-3 group bg-gradient-to-r from-violet-500/15 to-purple-500/15 border border-purple-400/20 text-purple-300 hover:text-white px-4 py-3 rounded-xl transition-all hover:border-purple-400/40 hover:from-violet-500/25 hover:to-purple-500/25"
                    >
                      <div className="text-right">
                        <p className="text-[10px] text-white/25 mb-0.5 font-medium uppercase tracking-wide">Next</p>
                        <p className="text-sm font-semibold truncate max-w-[180px]">{next.title}</p>
                      </div>
                      <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/30 transition-colors">
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

                {/* Keyboard shortcut hint */}
                <p className="text-white/15 text-[10px] text-center mt-4 hidden lg:block">
                  Use ← → arrow keys to navigate between lessons
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="text-center py-24 px-6">
            <BookOpen className="w-14 h-14 text-white/10 mx-auto mb-4" />
            <p className="text-white/40 text-lg">No lessons in this course yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
