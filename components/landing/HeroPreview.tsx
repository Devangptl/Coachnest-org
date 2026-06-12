"use client";

import { motion } from "framer-motion";
import {
  LayoutDashboard, BookOpen, Target, Award, Users, Settings,
  Play, Flame, Zap, TrendingUp, Code, Palette, ChevronRight,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "My Courses", icon: BookOpen, active: false },
  { label: "Quizzes", icon: Target, active: false },
  { label: "Certificates", icon: Award, active: false },
  { label: "Community", icon: Users, active: false },
  { label: "Settings", icon: Settings, active: false },
];

const COURSES = [
  { title: "React Mastery", lesson: "Advanced State Management", icon: Code, color: "text-cyan-500", bg: "bg-cyan-500/10", progress: 65 },
  { title: "UI/UX Design Fundamentals", lesson: "Design Systems at Scale", icon: Palette, color: "text-pink-500", bg: "bg-pink-500/10", progress: 38 },
];

const ACTIVITY = [35, 55, 40, 75, 60, 90, 70];
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export default function HeroPreview() {
  return (
    <div className="relative mx-auto max-w-5xl">
      {/* Ambient glow behind the window */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-8 -top-10 bottom-10 opacity-60"
        style={{
          background:
            "radial-gradient(60% 55% at 50% 35%, rgba(249,115,22,0.16), transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* ── App window ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative rounded-xl border border-border bg-card shadow-2xl shadow-black/20 overflow-hidden"
      >
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-secondary/40">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-1.5 bg-background/60 border border-border rounded-md px-3 py-1 text-[11px] text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              coachnest.com/dashboard
            </div>
          </div>
          <div className="w-12" />
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="hidden sm:flex w-44 flex-col gap-0.5 border-r border-border p-3 bg-secondary/20">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs ${
                    item.active
                      ? "bg-orange-500/10 text-[#d97757] font-semibold border border-orange-500/20"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </div>
              );
            })}
          </div>

          {/* Main panel */}
          <div className="flex-1 p-4 sm:p-6 space-y-5 text-left min-w-0">
            {/* Greeting */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-foreground font-semibold text-sm sm:text-base">
                  Welcome back, Priya 👋
                </p>
                <p className="text-muted-foreground text-[11px] sm:text-xs mt-0.5">
                  You&apos;re 2 lessons away from your weekly goal.
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1">
                <Flame className="w-3.5 h-3.5 text-[#d97757]" />
                <span className="text-[11px] font-bold text-[#d97757]">12-day streak</span>
              </div>
            </div>

            {/* Stat tiles */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {[
                { label: "In progress", value: "4 courses", icon: BookOpen, color: "text-[#d97757]", bg: "bg-orange-500/10" },
                { label: "Total XP", value: "2,450", icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10" },
                { label: "Avg. score", value: "92%", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="rounded-lg border border-border bg-secondary/30 p-2.5 sm:p-3">
                    <div className={`w-6 h-6 rounded-md ${stat.bg} flex items-center justify-center mb-2`}>
                      <Icon className={`w-3.5 h-3.5 ${stat.color}`} />
                    </div>
                    <p className="text-foreground font-bold text-xs sm:text-sm leading-none">{stat.value}</p>
                    <p className="text-muted-foreground text-[9px] sm:text-[10px] mt-1">{stat.label}</p>
                  </div>
                );
              })}
            </div>

            <div className="grid sm:grid-cols-[1fr_auto] gap-4 sm:gap-5">
              {/* Continue learning */}
              <div className="min-w-0">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-foreground text-xs font-semibold">Continue learning</p>
                  <span className="flex items-center text-[10px] text-muted-foreground">
                    View all <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
                <div className="space-y-2">
                  {COURSES.map((course) => {
                    const Icon = course.icon;
                    return (
                      <div key={course.title} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-2.5">
                        <div className={`w-8 h-8 rounded-md ${course.bg} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-4 h-4 ${course.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground text-[11px] font-semibold truncate">{course.title}</p>
                          <p className="text-muted-foreground text-[10px] truncate">{course.lesson}</p>
                          <div className="mt-1.5 h-1 rounded-full bg-border overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400"
                              initial={{ width: 0 }}
                              whileInView={{ width: `${course.progress}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-orange-500/15 border border-orange-500/25 flex items-center justify-center flex-shrink-0">
                          <Play className="w-3 h-3 text-[#d97757] fill-current ml-0.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weekly activity chart */}
              <div className="rounded-lg border border-border bg-secondary/30 p-3 sm:w-44">
                <p className="text-foreground text-xs font-semibold mb-3">This week</p>
                <div className="flex items-end justify-between gap-1.5 h-20">
                  {ACTIVITY.map((value, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 flex-1">
                      <motion.div
                        className={`w-full rounded-sm ${i === 5 ? "bg-gradient-to-t from-orange-600 to-orange-400" : "bg-orange-500/25"}`}
                        initial={{ height: 0 }}
                        whileInView={{ height: `${value}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 + i * 0.06, ease: "easeOut" }}
                      />
                      <span className="text-[8px] text-muted-foreground">{DAYS[i]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom fade into the page background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/90 to-transparent"
        />
      </motion.div>

      {/* ── Floating accent cards ──────────────────────────────────── */}
      <motion.div
        className="hero-showcase-card absolute -right-6 lg:-right-12 top-12 z-20 hidden md:flex items-center gap-2.5 px-3.5 py-2.5"
        initial={{ opacity: 0, x: 24 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="flex items-center gap-2.5"
        >
          <div className="w-8 h-8 rounded-md bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-foreground text-[11px] font-semibold leading-tight">Certificate earned</p>
            <p className="text-muted-foreground text-[10px]">React Mastery</p>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        className="hero-showcase-card absolute -left-6 lg:-left-12 bottom-16 z-20 hidden md:flex items-center gap-2.5 px-3.5 py-2.5"
        initial={{ opacity: 0, x: -24 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.65, duration: 0.5 }}
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          className="flex items-center gap-2.5"
        >
          <div className="w-8 h-8 rounded-md bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <p className="text-foreground text-[11px] font-semibold leading-tight">+50 XP</p>
            <p className="text-muted-foreground text-[10px]">Quiz passed · 9/10</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
