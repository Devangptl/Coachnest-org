"use client";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell,
} from "recharts";
import {
  BookOpen, CheckCircle, Clock, Zap, Target, TrendingUp,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

interface CourseProgress {
  courseId: string;
  title: string;
  total: number;
  done: number;
  progress: number;
  enrolledAt: string;
}

interface QuizResult {
  id: string;
  score: number;
  passed: boolean;
  createdAt: string;
  quizTitle: string;
  courseTitle: string;
}

interface WeeklyPoint {
  week: string;
  lessons: number;
  xp: number;
}

interface Props {
  weeklyActivity: WeeklyPoint[];
  courseProgress: CourseProgress[];
  quizHistory: QuizResult[];
  totalXp: number;
  totalLessonsCompleted: number;
  totalWatchedSeconds: number;
}

function formatHours(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function StudentProgressDashboard({
  weeklyActivity,
  courseProgress,
  quizHistory,
  totalXp,
  totalLessonsCompleted,
  totalWatchedSeconds,
}: Props) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const tooltipStyle = {
    contentStyle: {
      background: isLight ? "#ffffff" : "#1a1636",
      border: `1px solid ${isLight ? "rgba(24,19,16,.12)" : "rgba(255,255,255,.15)"}`,
      borderRadius: 12,
      color: isLight ? "#181310" : "#fff",
      fontSize: 13,
    },
    labelStyle: { color: isLight ? "#c2410c" : "#a78bfa", fontWeight: 600 },
  };

  const tickColor = isLight ? "#685e55" : "#a78bfa";
  const gridColor = isLight ? "rgba(24,19,16,.06)" : "rgba(255,255,255,.06)";
  const primaryColor = isLight ? "#c2410c" : "#d97757";
  const xpColor = isLight ? "#7c3aed" : "#a78bfa";

  const inProgress = courseProgress.filter((c) => c.progress > 0 && c.progress < 100);
  const completed = courseProgress.filter((c) => c.progress === 100);

  const avgQuizScore =
    quizHistory.length > 0
      ? Math.round(quizHistory.reduce((s, q) => s + q.score, 0) / quizHistory.length)
      : 0;

  const passRate =
    quizHistory.length > 0
      ? Math.round((quizHistory.filter((q) => q.passed).length / quizHistory.length) * 100)
      : 0;

  const summaryCards = [
    {
      label: "Lessons Completed",
      value: totalLessonsCompleted.toLocaleString(),
      icon: CheckCircle,
      color: "bg-emerald-500/20 text-emerald-400",
    },
    {
      label: "Total XP Earned",
      value: totalXp.toLocaleString(),
      icon: Zap,
      color: "bg-violet-500/20 text-violet-400",
    },
    {
      label: "Watch Time",
      value: formatHours(totalWatchedSeconds),
      icon: Clock,
      color: "bg-blue-500/20 text-blue-400",
    },
    {
      label: "Courses In Progress",
      value: inProgress.length,
      icon: TrendingUp,
      color: "bg-orange-500/15 text-[#d97757]",
    },
    {
      label: "Courses Completed",
      value: completed.length,
      icon: BookOpen,
      color: "bg-teal-500/20 text-teal-400",
    },
    {
      label: "Avg Quiz Score",
      value: quizHistory.length > 0 ? `${avgQuizScore}%` : "—",
      icon: Target,
      color: "bg-pink-500/20 text-pink-400",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">My Progress</h1>
        <p className="text-muted-foreground/70 text-sm mt-1">Your learning journey at a glance</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {summaryCards.map(({ label, value, icon: Icon, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass p-4 flex flex-col gap-2"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
            <p className="text-muted-foreground/70 text-xs leading-tight">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Weekly activity charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Lessons per week */}
        <div className="glass p-6">
          <h3 className="text-foreground font-semibold mb-1">Weekly Lessons Completed</h3>
          <p className="text-muted-foreground/60 text-xs mb-5">Last 8 weeks</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyActivity}>
              <CartesianGrid stroke={gridColor} strokeDasharray="4 4" />
              <XAxis
                dataKey="week"
                tick={{ fill: tickColor, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: tickColor, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(v: number) => [v, "Lessons"]}
              />
              <Bar dataKey="lessons" radius={[5, 5, 0, 0]}>
                {weeklyActivity.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={primaryColor}
                    opacity={entry.lessons === 0 ? 0.2 : 0.5 + (i / weeklyActivity.length) * 0.5}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* XP per week */}
        <div className="glass p-6">
          <h3 className="text-foreground font-semibold mb-1">Weekly XP Earned</h3>
          <p className="text-muted-foreground/60 text-xs mb-5">Last 8 weeks</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weeklyActivity}>
              <defs>
                <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={xpColor} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={xpColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={gridColor} strokeDasharray="4 4" />
              <XAxis
                dataKey="week"
                tick={{ fill: tickColor, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: tickColor, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(v: number) => [v, "XP"]}
              />
              <Area
                dataKey="xp"
                stroke={xpColor}
                strokeWidth={2.5}
                fill="url(#xpGrad)"
                dot={{ r: 3, fill: xpColor }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Course progress */}
      {courseProgress.length > 0 && (
        <div className="glass p-6">
          <h3 className="text-foreground font-semibold mb-5">Course Progress</h3>
          <div className="space-y-4">
            {courseProgress.map((c, i) => (
              <motion.div
                key={c.courseId}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.04 }}
                className="flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-foreground text-sm font-medium truncate pr-4">{c.title}</p>
                    <span
                      className={`text-xs font-semibold flex-shrink-0 ${
                        c.progress === 100
                          ? "text-emerald-400"
                          : c.progress > 0
                          ? "text-blue-400"
                          : "text-muted-foreground/50"
                      }`}
                    >
                      {c.progress}%
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${c.progress}%` }}
                      transition={{ duration: 0.8, delay: 0.2 + i * 0.06, ease: "easeOut" }}
                      className={`h-full rounded-full ${
                        c.progress === 100
                          ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                          : "bg-gradient-to-r from-orange-600 to-[#d97757]"
                      }`}
                    />
                  </div>
                  <p className="text-muted-foreground/50 text-xs mt-1">
                    {c.done} / {c.total} lessons
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Quiz history */}
      {quizHistory.length > 0 && (
        <div className="glass p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-foreground font-semibold">Quiz Performance</h3>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Avg score: <span className="text-foreground font-semibold">{avgQuizScore}%</span></span>
              <span>Pass rate: <span className="text-emerald-400 font-semibold">{passRate}%</span></span>
            </div>
          </div>
          <div className="space-y-2.5">
            {quizHistory.slice(0, 10).map((q) => (
              <div
                key={q.id}
                className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0"
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    q.passed
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-red-500/15 text-red-400"
                  }`}
                >
                  {q.score}%
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-medium truncate">{q.quizTitle}</p>
                  <p className="text-muted-foreground/60 text-xs truncate">{q.courseTitle}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      q.passed
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-red-500/15 text-red-400"
                    }`}
                  >
                    {q.passed ? "Passed" : "Failed"}
                  </span>
                  <p className="text-muted-foreground/50 text-[11px] mt-0.5">
                    {new Date(q.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {courseProgress.length === 0 && quizHistory.length === 0 && (
        <div className="glass p-12 text-center">
          <BookOpen className="w-14 h-14 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="text-foreground font-semibold mb-2">No activity yet</h3>
          <p className="text-muted-foreground text-sm">
            Enroll in a course and start learning to see your progress here.
          </p>
        </div>
      )}
    </div>
  );
}
