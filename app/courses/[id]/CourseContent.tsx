"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CourseTabs from "./CourseTabs";
import CourseProgress from "./CourseProgress";
import CourseViewer from "./CourseViewer";
import ReviewsSection from "./ReviewsSection";
import {
  CheckCircle2,
  Circle,
  PlayCircle,
  FileText,
  Clock,
  ChevronDown,
  Lightbulb,
  Target,
  Zap,
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

interface Props {
  courseId: string;
  description: string;
  lessons: Lesson[];
  isEnrolled: boolean;
  isLoggedIn: boolean;
  reviewCount: number;
}

export default function CourseContent({
  courseId,
  description,
  lessons,
  isEnrolled,
  isLoggedIn,
  reviewCount,
}: Props) {
  const [activeTab, setActiveTab] = useState("overview");
  const completedCount = lessons.filter((l) => l.completed).length;

  return (
    <div className="space-y-6">
      {/* Progress bar for enrolled users */}
      {isEnrolled && (
        <CourseProgress completedCount={completedCount} totalCount={lessons.length} />
      )}

      {/* Tabs */}
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
            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-400" />
                About This Course
              </h2>
              <div className="text-white/60 text-sm leading-relaxed whitespace-pre-line">
                {description}
              </div>
            </div>

            {/* What you'll learn */}
            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-400" />
                What You&apos;ll Learn
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {lessons.slice(0, 8).map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex items-start gap-2.5 text-white/60 text-sm"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>{lesson.title}</span>
                  </div>
                ))}
                {lessons.length > 8 && (
                  <div className="flex items-center gap-2 text-purple-400 text-sm">
                    <Zap className="w-4 h-4" />
                    And {lessons.length - 8} more topics...
                  </div>
                )}
              </div>
            </div>

            {/* Quick curriculum preview */}
            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                Course Content
              </h2>
              <p className="text-white/40 text-sm mb-4">
                {lessons.length} lessons &middot;{" "}
                {(() => {
                  const mins = lessons.reduce((s, l) => s + (l.duration ?? 0), 0);
                  return mins > 60
                    ? `${Math.floor(mins / 60)}h ${mins % 60}m`
                    : `${mins}m`;
                })()}{" "}
                total
              </p>
              <CurriculumPreview lessons={lessons} />
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
            <CourseViewer lessons={lessons} isEnrolled={isEnrolled} />
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
function CurriculumPreview({ lessons }: { lessons: Lesson[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? lessons : lessons.slice(0, 5);

  return (
    <div className="space-y-1">
      {visible.map((lesson, i) => {
        const Icon = lesson.type === "VIDEO" ? PlayCircle : FileText;
        return (
          <div
            key={lesson.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
          >
            <span className="text-white/30 text-xs w-5 text-right flex-shrink-0">
              {i + 1}
            </span>
            {lesson.completed ? (
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 flex-shrink-0" />
            ) : (
              <Circle className="w-4.5 h-4.5 text-white/20 flex-shrink-0" />
            )}
            <Icon className="w-4 h-4 text-white/30 flex-shrink-0" />
            <span className="text-white/70 text-sm flex-1 truncate">{lesson.title}</span>
            {lesson.isFree && (
              <span className="text-[10px] text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-full border border-emerald-400/20">
                Free
              </span>
            )}
            {lesson.duration && (
              <span className="text-white/30 text-xs flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {lesson.duration}m
              </span>
            )}
          </div>
        );
      })}

      {lessons.length > 5 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm px-3 py-2 transition-colors w-full"
        >
          <ChevronDown className={cn("w-4 h-4 transition-transform", expanded && "rotate-180")} />
          {expanded ? "Show less" : `Show all ${lessons.length} lessons`}
        </button>
      )}
    </div>
  );
}
