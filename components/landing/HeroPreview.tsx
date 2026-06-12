"use client";

import { useState, type ReactElement } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, BookOpen, Target, Award, Users, Settings,
  Play, Flame, Zap, TrendingUp, Code, Palette, Database, Layers,
  ChevronRight, CheckCircle2, Circle, Star, MessageSquare,
  Download, Bell, Moon, User,
} from "lucide-react";

type TabId = "dashboard" | "courses" | "quizzes" | "certificates" | "community" | "settings";

const NAV_ITEMS: Array<{ id: TabId; label: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "courses", label: "My Courses", icon: BookOpen },
  { id: "quizzes", label: "Quizzes", icon: Target },
  { id: "certificates", label: "Certificates", icon: Award },
  { id: "community", label: "Community", icon: Users },
  { id: "settings", label: "Settings", icon: Settings },
];

const MY_COURSES = [
  { title: "React Mastery", lessons: "16/24 lessons", icon: Code, color: "text-cyan-500", bg: "bg-cyan-500/10", progress: 65 },
  { title: "UI/UX Design", lessons: "7/18 lessons", icon: Palette, color: "text-pink-500", bg: "bg-pink-500/10", progress: 38 },
  { title: "SQL & Databases", lessons: "13/16 lessons", icon: Database, color: "text-emerald-500", bg: "bg-emerald-500/10", progress: 82 },
  { title: "Full-Stack Dev", lessons: "4/32 lessons", icon: Layers, color: "text-amber-500", bg: "bg-amber-500/10", progress: 12 },
];

const ACTIVITY = [35, 55, 40, 75, 60, 90, 70];
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

/* ── Tab panels ───────────────────────────────────────────────────────────── */

function DashboardPanel() {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-foreground font-semibold text-sm sm:text-base">
            Welcome back, Devang 👋
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
        <div className="min-w-0">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-foreground text-xs font-semibold">Continue learning</p>
            <span className="flex items-center text-[10px] text-muted-foreground">
              View all <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <div className="space-y-2">
            {MY_COURSES.slice(0, 2).map((course) => {
              const Icon = course.icon;
              return (
                <div key={course.title} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-2.5">
                  <div className={`w-8 h-8 rounded-md ${course.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${course.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-[11px] font-semibold truncate">{course.title}</p>
                    <p className="text-muted-foreground text-[10px] truncate">{course.lessons}</p>
                    <div className="mt-1.5 h-1 rounded-full bg-border overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${course.progress}%` }}
                        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
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

        <div className="rounded-lg border border-border bg-secondary/30 p-3 sm:w-44">
          <p className="text-foreground text-xs font-semibold mb-3">This week</p>
          <div className="flex items-end justify-between gap-1.5 h-20">
            {ACTIVITY.map((value, i) => (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <motion.div
                  className={`w-full rounded-sm ${i === 5 ? "bg-gradient-to-t from-orange-600 to-orange-400" : "bg-orange-500/25"}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${value}%` }}
                  transition={{ duration: 0.5, delay: 0.15 + i * 0.05, ease: "easeOut" }}
                />
                <span className="text-[8px] text-muted-foreground">{DAYS[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CoursesPanel() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-foreground font-semibold text-sm sm:text-base">My Courses</p>
          <p className="text-muted-foreground text-[11px] sm:text-xs mt-0.5">4 enrolled · 1 completed</p>
        </div>
        <span className="text-[10px] text-[#d97757] font-semibold bg-orange-500/10 border border-orange-500/20 rounded-full px-2.5 py-1">
          Browse more
        </span>
      </div>
      <div className="grid sm:grid-cols-2 gap-2.5">
        {MY_COURSES.map((course, i) => {
          const Icon = course.icon;
          return (
            <motion.div
              key={course.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              className="rounded-lg border border-border bg-secondary/30 p-3"
            >
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className={`w-8 h-8 rounded-md ${course.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${course.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-foreground text-[11px] font-semibold truncate">{course.title}</p>
                  <p className="text-muted-foreground text-[10px]">{course.lessons}</p>
                </div>
              </div>
              <div className="h-1 rounded-full bg-border overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${course.progress}%` }}
                  transition={{ duration: 0.7, delay: 0.15 + i * 0.06, ease: "easeOut" }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[9px] text-muted-foreground">{course.progress}% complete</span>
                <span className="text-[9px] text-[#d97757] font-semibold flex items-center gap-0.5">
                  Resume <ChevronRight className="w-2.5 h-2.5" />
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function QuizzesPanel() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-foreground font-semibold text-sm sm:text-base">Chapter Quiz · React Hooks</p>
        <p className="text-muted-foreground text-[11px] sm:text-xs mt-0.5">Question 3 of 10</p>
      </div>
      <div className="rounded-lg border border-border bg-secondary/30 p-3.5">
        <p className="text-foreground text-[12px] font-medium mb-3">
          When does <span className="text-[#d97757] font-mono">useEffect</span> run by default?
        </p>
        <div className="space-y-1.5">
          {[
            { text: "After every render", state: "correct" },
            { text: "Before the component mounts", state: "idle" },
            { text: "Only on the first render", state: "idle" },
          ].map((opt, i) => (
            <motion.div
              key={opt.text}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07, duration: 0.25 }}
              className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-[11px] ${
                opt.state === "correct"
                  ? "border-emerald-500/40 bg-emerald-500/[0.08] text-foreground"
                  : "border-border bg-background/40 text-muted-foreground"
              }`}
            >
              {opt.state === "correct" ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
              )}
              {opt.text}
            </motion.div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-orange-500/20 bg-orange-500/[0.06] px-3 py-2">
        <span className="text-[11px] text-foreground font-semibold flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-500" /> Correct! +10 XP
        </span>
        <span className="text-[10px] text-muted-foreground">Streak bonus active</span>
      </div>
    </div>
  );
}

function CertificatesPanel() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-foreground font-semibold text-sm sm:text-base">Certificates</p>
        <p className="text-muted-foreground text-[11px] sm:text-xs mt-0.5">2 earned · shareable on LinkedIn</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-2.5">
        {[
          { course: "JavaScript Essentials", id: "CN-8F2K-2026", date: "Mar 2026" },
          { course: "Git & GitHub Basics", id: "CN-4T9M-2026", date: "Jan 2026" },
        ].map((cert, i) => (
          <motion.div
            key={cert.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
            className="rounded-lg border border-border bg-secondary/30 p-3.5 text-center"
          >
            <div className="w-9 h-9 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mb-2">
              <Award className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-foreground text-[11px] font-semibold">{cert.course}</p>
            <p className="text-muted-foreground text-[9px] mt-0.5">{cert.id} · {cert.date}</p>
            <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[10px] text-[#d97757] font-semibold">
              <Download className="w-3 h-3" /> Download PDF
            </div>
          </motion.div>
        ))}
      </div>
      <div className="rounded-lg border border-dashed border-border bg-background/30 p-3 text-center">
        <p className="text-muted-foreground text-[10px]">
          Complete <span className="text-foreground font-medium">React Mastery</span> to earn your next certificate — 65% there!
        </p>
      </div>
    </div>
  );
}

function CommunityPanel() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-foreground font-semibold text-sm sm:text-base">Community</p>
          <p className="text-muted-foreground text-[11px] sm:text-xs mt-0.5">Forums · study groups · peer review</p>
        </div>
        <span className="text-[10px] text-[#d97757] font-semibold bg-orange-500/10 border border-orange-500/20 rounded-full px-2.5 py-1">
          New thread
        </span>
      </div>
      <div className="space-y-2">
        {[
          { title: "How do you structure large React apps?", meta: "12 replies · 34 upvotes", color: "from-cyan-500 to-blue-500", initials: "AK" },
          { title: "Study group for SQL & Databases — join us!", meta: "8 members · active now", color: "from-emerald-500 to-teal-500", initials: "MR" },
          { title: "Feedback on my capstone project?", meta: "3 reviews · peer review", color: "from-pink-500 to-rose-500", initials: "SJ" },
        ].map((thread, i) => (
          <motion.div
            key={thread.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.25 }}
            className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-2.5"
          >
            <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${thread.color} flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0`}>
              {thread.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-[11px] font-semibold truncate">{thread.title}</p>
              <p className="text-muted-foreground text-[10px]">{thread.meta}</p>
            </div>
            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-foreground font-semibold text-sm sm:text-base">Settings</p>
        <p className="text-muted-foreground text-[11px] sm:text-xs mt-0.5">Manage your profile and preferences</p>
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#d97757] to-amber-500 flex items-center justify-center text-white text-xs font-bold">
          DP
        </div>
        <div>
          <p className="text-foreground text-[12px] font-semibold">Devang Patel</p>
          <p className="text-muted-foreground text-[10px]">devang@example.com · Student</p>
        </div>
        <span className="ml-auto text-[10px] text-[#d97757] font-semibold flex items-center gap-1 flex-shrink-0 whitespace-nowrap">
          <User className="w-3 h-3" /> Edit profile
        </span>
      </div>
      <div className="space-y-1.5">
        {[
          { label: "Email notifications", desc: "Course updates & reminders", icon: Bell, on: true },
          { label: "Dark mode", desc: "Easier on the eyes at night", icon: Moon, on: true },
          { label: "Public certificates", desc: "Visible on your profile", icon: Award, on: false },
        ].map((setting, i) => {
          const Icon = setting.icon;
          return (
            <motion.div
              key={setting.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.25 }}
              className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2.5"
            >
              <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-foreground text-[11px] font-semibold">{setting.label}</p>
                <p className="text-muted-foreground text-[10px]">{setting.desc}</p>
              </div>
              <div className={`w-7 h-4 rounded-full flex items-center px-0.5 transition-colors ${setting.on ? "bg-orange-500 justify-end" : "bg-border justify-start"}`}>
                <div className="w-3 h-3 rounded-full bg-white shadow" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

const PANELS: Record<TabId, () => ReactElement> = {
  dashboard: DashboardPanel,
  courses: CoursesPanel,
  quizzes: QuizzesPanel,
  certificates: CertificatesPanel,
  community: CommunityPanel,
  settings: SettingsPanel,
};

/* ── Component ────────────────────────────────────────────────────────────── */

export default function HeroPreview() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const ActivePanel = PANELS[activeTab];

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
        className="relative rounded-xl border border-border bg-card overflow-hidden"
      >
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-secondary/40">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          </div>
          <div className="flex-1 flex justify-center min-w-0">
            <div className="flex items-center gap-1.5 bg-background/60 border border-border rounded-md px-3 py-1 text-[11px] text-muted-foreground min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
              <span className="truncate">coachnest.com/{activeTab}</span>
            </div>
          </div>
          <div className="hidden sm:block w-12" />
        </div>

        {/* Mobile tab bar (sidebar is hidden below sm) */}
        <div className="flex sm:hidden gap-1 overflow-x-auto border-b border-border bg-secondary/20 px-2 py-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-orange-500/10 text-[#d97757] font-semibold border border-orange-500/20"
                    : "text-muted-foreground border border-transparent"
                }`}
              >
                <Icon className="w-3 h-3" />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex">
          {/* Sidebar — click a tab to switch the panel */}
          <div className="hidden sm:flex w-44 flex-col gap-0.5 border-r border-border p-3 bg-secondary/20">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs text-left transition-colors ${
                    isActive
                      ? "text-[#d97757] font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="heroNavActive"
                      className="absolute inset-0 rounded-md bg-orange-500/10 border border-orange-500/20"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <Icon className="relative w-3.5 h-3.5" />
                  <span className="relative">{item.label}</span>
                </button>
              );
            })}

            <div className="mt-auto pt-3 border-t border-border">
              <div className="flex items-center gap-2 px-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#d97757] to-amber-500 flex items-center justify-center text-white text-[8px] font-bold">
                  DP
                </div>
                <div className="min-w-0">
                  <p className="text-foreground text-[10px] font-semibold truncate">Devang Patel</p>
                  <p className="text-muted-foreground text-[9px] flex items-center gap-0.5">
                    <Star className="w-2 h-2 text-amber-400 fill-current" /> Level 5
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main panel — swaps with the selected sidebar tab */}
          <div className="flex-1 p-4 sm:p-6 text-left min-w-0 min-h-[340px] sm:min-h-[380px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <ActivePanel />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom fade into the page background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background/80 to-transparent"
        />
      </motion.div>

      {/* ── Floating accent cards ──────────────────────────────────── */}
      <motion.div
        className="hero-showcase-card absolute -right-6 lg:-right-12 top-12 z-20 hidden md:flex items-center gap-2.5 px-3.5 py-2.5 pointer-events-none"
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
        className="hero-showcase-card absolute -left-6 lg:-left-12 bottom-16 z-20 hidden md:flex items-center gap-2.5 px-3.5 py-2.5 pointer-events-none"
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
