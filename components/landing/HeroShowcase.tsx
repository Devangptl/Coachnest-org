"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ChevronDown, FolderOpen,
  BookOpen, FileText, Brain, MessageSquare,
  Sparkles, GraduationCap, Trophy,
  Code, Palette, Database, Layers,
  Play, Clock, Users, Star, Zap, TrendingUp,
  CheckCircle2, ArrowRight,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

/* ── Data ─────────────────────────────────────────────────────────────────── */

interface CourseItem {
  id: string;
  name: string;
  icon: typeof Code;
  color: string;
  accent: string;
  students: string;
  lessons: number;
  rating: number;
}

const COURSES: CourseItem[] = [
  { id: "react", name: "React Mastery", icon: Code, color: "#61dafb", accent: "rgba(97,218,251,0.12)", students: "2.4k", lessons: 24, rating: 4.9 },
  { id: "design", name: "UI/UX Design", icon: Palette, color: "#f472b6", accent: "rgba(244,114,182,0.12)", students: "1.8k", lessons: 18, rating: 4.8 },
  { id: "database", name: "SQL & Databases", icon: Database, color: "#34d399", accent: "rgba(52,211,153,0.12)", students: "1.2k", lessons: 16, rating: 4.7 },
  { id: "fullstack", name: "Full-Stack Dev", icon: Layers, color: "#fbbf24", accent: "rgba(251,191,36,0.12)", students: "3.1k", lessons: 32, rating: 4.9 },
];

const PROGRESS_STEPS = [
  { id: 1, text: "Watch video lessons", done: true },
  { id: 2, text: "Complete code exercises", done: true },
  { id: 3, text: "Take chapter quizzes", done: true },
  { id: 4, text: "Build capstone project", done: false },
  { id: 5, text: "Submit for review", done: false },
  { id: 6, text: "Earn certificate", done: false },
];

const CONTEXT_ITEMS = [
  { id: "course", name: "Course Materials", icon: BookOpen, color: "#f97316", badge: "12 files" },
  { id: "notes", name: "SKILL.md", icon: FileText, color: "#a78bfa", badge: null },
  { id: "ai", name: "AI Tutor", icon: Brain, color: "#22d3ee", badge: "Online" },
  { id: "discuss", name: "Discussion", icon: MessageSquare, color: "#f472b6", badge: "3 new" },
  { id: "cert", name: "Certificate", icon: GraduationCap, color: "#34d399", badge: null },
];

/* ── Component ────────────────────────────────────────────────────────────── */

export default function HeroShowcase() {
  const [selectedCourse, setSelectedCourse] = useState<string>("react");
  const [selectedContext, setSelectedContext] = useState<string>("course");
  const [steps, setSteps] = useState(PROGRESS_STEPS);
  const [hoveredCourse, setHoveredCourse] = useState<string | null>(null);
  const { theme } = useTheme();
  const isLight = theme === "light";

  // Replaces rgba(255,255,255,X) with warm-dark equivalent in light mode
  const aw = (opacity: number) =>
    isLight ? `rgba(24,19,16,${opacity})` : `rgba(255,255,255,${opacity})`;

  function toggleStep(id: number) {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, done: !s.done } : s))
    );
  }

  const completedCount = steps.filter((s) => s.done).length;
  const activeCourse = COURSES.find((c) => c.id === selectedCourse)!;

  return (
    <div className="relative w-full h-[460px] lg:h-[480px] select-none scale-95 lg:scale-100 origin-right">
      {/* ── Ambient glow behind cards ──────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[15%] w-48 h-48 rounded-full opacity-40"
          style={{ background: `radial-gradient(circle, ${activeCourse.color}18, transparent 70%)` }} />
        <div className="absolute bottom-[15%] right-[10%] w-64 h-64 rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, rgba(249,115,22,0.12), transparent 70%)" }} />
      </div>

      {/* ── Dot grid ───────────────────────────────────────────────────── */}
      <div className="absolute inset-0 hero-dot-grid rounded-md opacity-50" />

      {/* ═══════════════════════════════════════════════════════════════════
          COURSE BROWSER CARD (Top Left)
      ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        className="hero-showcase-card absolute top-6 left-0 lg:left-4 w-[215px] lg:w-[230px] z-10"
        initial={{ opacity: 0, y: 30, x: -15 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ delay: 0.25, type: "spring", stiffness: 120, damping: 18 }}
      >
        {/* Header with Search */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.06]"
          style={{ borderColor: aw(0.07) }}>
          <Search className="w-3 h-3 text-white/25" />
          <span className="text-white/25 text-[11px] flex-1">Search courses…</span>
          <div className="w-4 h-4 rounded flex items-center justify-center"
            style={{ background: aw(0.04) }}>
            <span className="text-white/20 text-[8px] font-bold">⌘K</span>
          </div>
        </div>

        {/* Course Grid */}
        <div className="p-2.5 grid grid-cols-2 gap-1.5">
          {COURSES.map((course) => {
            const Icon = course.icon;
            const isActive = selectedCourse === course.id;
            const isHovered = hoveredCourse === course.id;
            return (
              <motion.button
                key={course.id}
                onClick={() => setSelectedCourse(course.id)}
                onMouseEnter={() => setHoveredCourse(course.id)}
                onMouseLeave={() => setHoveredCourse(null)}
                whileTap={{ scale: 0.96 }}
                className="relative flex flex-col items-center gap-1.5 p-2.5 rounded-md transition-all duration-250 cursor-pointer"
                style={{
                  background: isActive ? aw(0.08) : "transparent",
                  border: isActive
                    ? `1px solid ${course.color}40`
                    : `1px solid transparent`,
                  boxShadow: isActive
                    ? `0 4px 20px ${course.color}12, inset 0 1px 0 ${course.color}15`
                    : "none",
                }}
              >
                {/* Glow dot on active */}
                {isActive && (
                  <motion.div
                    layoutId="courseGlow"
                    className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full"
                    style={{ background: `linear-gradient(90deg, transparent, ${course.color}, transparent)` }}
                  />
                )}
                <div
                  className="w-10 h-10 rounded-md flex items-center justify-center transition-all duration-300"
                  style={{
                    background: isActive || isHovered ? course.accent : aw(0.03),
                    boxShadow: isActive ? `0 0 16px ${course.color}15` : "none",
                  }}
                >
                  <Icon
                    className="w-[18px] h-[18px] transition-all duration-300"
                    style={{ color: isActive || isHovered ? course.color : aw(0.28) }}
                  />
                </div>
                <span
                  className={`text-[9px] leading-tight text-center transition-all duration-200 ${isActive ? "text-white/90 font-semibold" : "text-white/35"
                    }`}
                >
                  {course.name}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-white/[0.06]"
          style={{ borderColor: aw(0.07) }}>
          <button className="text-white/25 text-[10px] hover:text-white/50 transition-colors px-2 py-0.5 rounded hover:bg-white/[0.04]">
            Cancel
          </button>
          <button className="text-white text-[10px] font-semibold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition-all px-4 py-1 rounded-md shadow-md shadow-orange-500/20">
            Open
          </button>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          PROGRESS CARD (Center-Bottom) — bigger, richer
      ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        className="hero-showcase-card absolute top-[110px] right-0 lg:right-4 w-[260px] lg:w-[280px] z-20"
        initial={{ opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, type: "spring", stiffness: 120, damping: 18 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]"
          style={{ borderColor: aw(0.07) }}>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-orange-500/15 flex items-center justify-center">
              <TrendingUp className="w-3 h-3 text-orange-400" />
            </div>
            <span className="text-white/90 text-[13px] font-semibold">Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-orange-500/10 border border-orange-400/15 rounded-full px-2 py-0.5">
              <span className="text-[9px] text-orange-400 font-bold">
                {completedCount}/{steps.length}
              </span>
            </div>
            <ChevronDown className="w-3 h-3 text-white/25" />
          </div>
        </div>

        {/* Steps */}
        <div className="px-2 py-2 space-y-[2px]">
          {steps.map((step, i) => (
            <motion.button
              key={step.id}
              onClick={() => toggleStep(step.id)}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg hover:bg-white/[0.03] transition-all group text-left"
            >
              <motion.div
                className="flex items-center justify-center w-[18px] h-[18px] rounded-full flex-shrink-0"
                animate={{
                  background: step.done
                    ? "linear-gradient(135deg, #f97316, #ea580c)"
                    : aw(0.04),
                  border: step.done ? "none" : `1.5px solid ${aw(0.12)}`,
                }}
                transition={{ duration: 0.2 }}
              >
                {step.done ? (
                  <CheckCircle2 className="w-[18px] h-[18px] text-white" />
                ) : (
                  <span className="text-[8px] font-bold text-white/25">{step.id}</span>
                )}
              </motion.div>
              <span
                className={`text-[11px] transition-all duration-200 ${step.done
                  ? "text-white/35 decoration-white/20"
                  : step.id === completedCount + 1
                    ? "text-white/80 font-medium"
                    : "text-white/50"
                  }`}
              >
                {step.text}
              </span>
              {step.id === completedCount + 1 && !step.done && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse flex-shrink-0" />
              )}
            </motion.button>
          ))}
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-3 pt-1">
          <div className="h-[5px] rounded-full overflow-hidden relative" style={{ background: aw(0.05) }}>
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, #ea580c, #f97316, #fb923c)",
                boxShadow: "0 0 12px rgba(249,115,22,0.4)",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / steps.length) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[9px] text-white/20">
              {Math.round((completedCount / steps.length) * 100)}% complete
            </span>
            <span className="text-[9px] text-orange-400/60 font-medium">
              {steps.length - completedCount} remaining
            </span>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          NEXT LESSON CARD — Positioned below Search Card
      ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        className="hero-showcase-card absolute top-[310px] left-0 lg:left-4 w-[215px] lg:w-[230px] z-10"
        initial={{ opacity: 0, y: 30, x: -15 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ delay: 0.35, type: "spring", stiffness: 120, damping: 18 }}
      >
        <div className="px-3.5 py-3 flex items-start gap-3">

          <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 border border-orange-500/30">
            <Play className="w-3.5 h-3.5 text-orange-400 ml-0.5" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[9px] text-orange-400/80 font-bold tracking-wider uppercase mb-0.5">Up Next</p>
            <p className="text-white/90 text-xs font-semibold truncate">Advanced State Management</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Clock className="w-2.5 h-2.5 text-white/40" />
              <span className="text-[10px] text-white/40">12 min left</span>
            </div>
          </div>
        </div>

        {/* Progress bar across bottom */}
        <div className="h-1 w-full" style={{ background: aw(0.06) }}>
          <motion.div
            className="h-full bg-gradient-to-r from-orange-600 to-orange-400"
            initial={{ width: 0 }}
            animate={{ width: "65%" }}
            transition={{ delay: 0.8, duration: 1 }}
          />
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          ACTIVE COURSE INFO — Positioned top right
      ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        className="absolute top-6 right-0 lg:right-4 z-30"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedCourse}
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{ duration: 0.3 }}
            className="hero-showcase-card flex items-center gap-3 px-3.5 py-3 w-[210px]"
          >
            <div
              className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${activeCourse.color}20, ${activeCourse.color}08)`,
                border: `1px solid ${activeCourse.color}20`,
              }}
            >
              <activeCourse.icon className="w-5 h-5" style={{ color: activeCourse.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-white/90 text-[11px] font-semibold truncate">
                {activeCourse.name}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-0.5 text-[9px] text-white/30">
                  <Users className="w-2.5 h-2.5" /> {activeCourse.students}
                </span>
                <span className="flex items-center gap-0.5 text-[9px] text-amber-400/70">
                  <Star className="w-2.5 h-2.5 fill-current" /> {activeCourse.rating}
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          CONNECTOR LINES (decorative)
      ═══════════════════════════════════════════════════════════════════ */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-[5] opacity-[0.07]" preserveAspectRatio="none">
        <motion.line
          x1="230" y1="200" x2="265" y2="240"
          stroke="url(#lineGrad)" strokeWidth="1" strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
        />
        <motion.line
          x1="380" y1="120" x2="350" y2="240"
          stroke="url(#lineGrad)" strokeWidth="1" strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.9, duration: 1 }}
        />
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={isLight ? "#181310" : "white"} stopOpacity="0.5" />
            <stop offset="100%" stopColor={isLight ? "#181310" : "white"} stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
