"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Lock,
  PlayCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
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
}

export default function CourseViewer({ lessons, isEnrolled }: Props) {
  const [activeLessonId, setActiveLessonId] = useState<string>(
    lessons[0]?.id ?? ""
  );
  const [completed, setCompleted] = useState<Record<string, boolean>>(
    Object.fromEntries(lessons.map((l) => [l.id, l.completed]))
  );
  const [marking, setMarking] = useState(false);

  const activeLesson = lessons.find((l) => l.id === activeLessonId);
  const activeIndex = lessons.findIndex((l) => l.id === activeLessonId);
  const prev = lessons[activeIndex - 1];
  const next = lessons[activeIndex + 1];

  async function toggleComplete(lessonId: string) {
    if (!isEnrolled || marking) return;
    setMarking(true);
    const nextVal = !completed[lessonId];
    setCompleted((prev) => ({ ...prev, [lessonId]: nextVal }));
    try {
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, completed: nextVal }),
      });
    } catch {
      setCompleted((prev) => ({ ...prev, [lessonId]: !nextVal }));
    } finally {
      setMarking(false);
    }
  }

  return (
    <div className="flex flex-col xl:flex-row gap-5">
      {/* ── Lesson sidebar ─────────────────────────────────── */}
      <div className="xl:w-80 flex-shrink-0">
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-4 py-3.5 border-b border-white/10">
            <p className="text-white font-semibold text-sm">Course Lessons</p>
            <p className="text-white/40 text-xs mt-0.5">
              {Object.values(completed).filter(Boolean).length}/{lessons.length} completed
            </p>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {lessons.map((lesson, i) => {
              const isActive = lesson.id === activeLessonId;
              const isCompleted = completed[lesson.id];
              const Icon = lesson.type === "VIDEO" ? PlayCircle : FileText;

              return (
                <button
                  key={lesson.id}
                  onClick={() => setActiveLessonId(lesson.id)}
                  className={cn(
                    "flex items-center gap-3 w-full px-4 py-3 text-left transition-all border-l-2",
                    isActive
                      ? "bg-purple-500/10 border-l-purple-500 text-white"
                      : "border-l-transparent hover:bg-white/5 text-white/60"
                  )}
                >
                  {/* Number / status */}
                  <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : isActive ? (
                      <div className="w-5 h-5 rounded-full border-2 border-purple-400 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-purple-400" />
                      </div>
                    ) : (
                      <span className="text-xs text-white/30">{i + 1}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm truncate", isActive ? "font-medium" : "")}>
                      {lesson.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Icon className="w-3 h-3 text-white/30" />
                      <span className="text-[11px] text-white/30">
                        {lesson.type === "VIDEO"
                          ? lesson.duration ? `${lesson.duration} min` : "Video"
                          : "Reading"}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content area ───────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {!isEnrolled ? (
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-5">
              <Lock className="w-10 h-10 text-white/15" />
            </div>
            <h3 className="text-white text-xl font-semibold mb-2">
              Enroll to Access Content
            </h3>
            <p className="text-white/40 text-sm max-w-sm">
              Get full access to all {lessons.length} lessons, quizzes, and downloadable resources.
            </p>
          </div>
        ) : activeLesson ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeLesson.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
            >
              {/* Lesson header */}
              <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                    activeLesson.type === "VIDEO"
                      ? "bg-purple-500/20"
                      : "bg-blue-500/20"
                  )}>
                    {activeLesson.type === "VIDEO" ? (
                      <PlayCircle className="w-4 h-4 text-purple-400" />
                    ) : (
                      <FileText className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white/40 text-xs">
                      Lesson {activeIndex + 1} of {lessons.length}
                    </p>
                    <h2 className="text-white font-semibold text-lg truncate">
                      {activeLesson.title}
                    </h2>
                  </div>
                </div>

                {/* Mark complete */}
                <button
                  onClick={() => toggleComplete(activeLesson.id)}
                  disabled={marking}
                  className={cn(
                    "flex items-center gap-2 text-sm px-4 py-2 rounded-xl border transition-all flex-shrink-0",
                    completed[activeLesson.id]
                      ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-400"
                      : "bg-white/5 border-white/15 text-white/50 hover:text-white hover:bg-white/10"
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
              </div>

              {/* Content */}
              <div className="p-6">
                {activeLesson.type === "VIDEO" && activeLesson.content ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black/50 border border-white/5">
                    <iframe
                      src={activeLesson.content}
                      title={activeLesson.title}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="prose prose-invert max-w-none">
                    <div className="bg-white/[0.03] border border-white/5 rounded-xl p-6 text-white/80 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                      {activeLesson.content ?? "No content yet."}
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between mt-6 pt-5 border-t border-white/10">
                  {prev ? (
                    <button
                      onClick={() => setActiveLessonId(prev.id)}
                      className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors group"
                    >
                      <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                      <div className="text-left">
                        <p className="text-[11px] text-white/30">Previous</p>
                        <p className="truncate max-w-[150px]">{prev.title}</p>
                      </div>
                    </button>
                  ) : (
                    <span />
                  )}
                  {next ? (
                    <button
                      onClick={() => setActiveLessonId(next.id)}
                      className="flex items-center gap-2 text-sm group bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-purple-400/20 text-purple-300 hover:text-white px-4 py-2 rounded-xl transition-all"
                    >
                      <div className="text-right">
                        <p className="text-[11px] text-white/30">Next</p>
                        <p className="truncate max-w-[150px]">{next.title}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-400 text-sm">
                      <Sparkles className="w-4 h-4" />
                      You&apos;ve reached the end!
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl text-center py-20">
            <p className="text-white/40">No lessons in this course yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
