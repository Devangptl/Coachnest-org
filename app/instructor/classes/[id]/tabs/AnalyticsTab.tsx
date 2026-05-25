"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  UserCheck,
  Activity,
  TrendingUp,
  Video,
  Clock,
  ClipboardList,
  HelpCircle,
  Trophy,
  AlertTriangle,
  Calendar,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

// ─── Types matching service output ────────────────────────────────────────────

type KPIs = {
  totalStudents: number;
  activeStudents: number;
  pendingRequests: number;
  avgProgressPct: number;
  attendanceRate: number;
  totalLiveSessions: number;
  totalWatchHours: number;
  totalAssignments: number;
  totalQuizzes: number;
};

type LessonRow = {
  lessonId: string;
  title: string;
  type: string;
  courseTitle: string;
  completionPct: number;
  completedCount: number;
  totalStudents: number;
  watchSecs: number;
};

type QuizRow = {
  quizId: string;
  title: string;
  passMark: number;
  takenBy: number;
  totalAttempts: number;
  passCount: number;
  passRate: number;
  avgScore: number;
};

type AssignmentRow = {
  assignmentId: string;
  title: string;
  status: string;
  maxScore: number;
  passingScore: number;
  dueAt: string | null;
  submittedCount: number;
  submissionRate: number;
  gradedCount: number;
  passCount: number;
  lateCount: number;
  avgScore: number;
};

type SessionRow = {
  id: string;
  title: string;
  scheduledAt: string;
  status: string;
  attendees: number;
};

type Analytics = {
  kpis: KPIs;
  enrollmentsByStatus: Array<{ status: string; count: number }>;
  enrollmentTrend: Array<{ date: string; enrollments: number }>;
  attendance: Record<string, number>;
  sessions: SessionRow[];
  lessonStats: LessonRow[];
  topLessons: LessonRow[];
  bottomLessons: LessonRow[];
  quizStats: QuizRow[];
  assignmentStats: AssignmentRow[];
  topStudents: Array<{
    userId: string;
    name: string;
    avatar: string | null;
    xpEarned: number;
    progressPct: number;
    attendStreak: number;
  }>;
  struggling: Array<{
    userId: string;
    name: string;
    avatar: string | null;
    progressPct: number;
    lastActiveAt: string | null;
  }>;
};

export default function AnalyticsTab({ classId }: { classId: string }) {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/classes/${classId}/analytics`)
      .then(async (r) => {
        const d = await r.json();
        if (cancelled) return;
        if (!r.ok || d.error) {
          setError(d.error ?? "Failed to load analytics");
        } else {
          setData(d);
        }
      })
      .catch(() => !cancelled && setError("Network error"))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [classId]);

  // ── Chart styling ─────────────────────────────────────────────────────────
  const tickColor = isLight ? "#685e55" : "#94a3b8";
  const gridColor = isLight ? "rgba(24,19,16,.06)" : "rgba(255,255,255,.06)";
  const primary = isLight ? "#c2410c" : "#d97757";
  const emerald = isLight ? "#059669" : "#34d399";
  const sky = isLight ? "#0284c7" : "#38bdf8";
  const amber = isLight ? "#d97706" : "#fbbf24";
  const red = isLight ? "#dc2626" : "#f87171";

  const tooltipStyle = {
    contentStyle: {
      background: isLight ? "#ffffff" : "#1a1636",
      border: `1px solid ${isLight ? "rgba(24,19,16,.12)" : "rgba(255,255,255,.15)"}`,
      borderRadius: 12,
      color: isLight ? "#181310" : "#fff",
      fontSize: 13,
    },
    labelStyle: { color: primary, fontWeight: 600 },
  };

  const enrollDelta = useMemo(() => {
    if (!data) return 0;
    const trend = data.enrollmentTrend;
    if (trend.length < 14) return 0;
    const last7 = trend.slice(-7).reduce((a, b) => a + b.enrollments, 0);
    const prev7 = trend.slice(-14, -7).reduce((a, b) => a + b.enrollments, 0);
    if (prev7 === 0) return last7 > 0 ? 100 : 0;
    return Math.round(((last7 - prev7) / prev7) * 100);
  }, [data]);

  if (loading) {
    return (
      <div className="text-center py-10">
        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="glass p-10 rounded-xl text-center text-sm text-muted-foreground">
        {error ?? "No analytics available."}
      </div>
    );
  }

  const kpis = [
    {
      label: "Students",
      value: data.kpis.totalStudents,
      sub: `${data.kpis.activeStudents} active this week`,
      Icon: Users,
      color: "bg-violet-500/15 text-violet-400",
    },
    {
      label: "Active rate",
      value: data.kpis.totalStudents
        ? `${Math.round((data.kpis.activeStudents / data.kpis.totalStudents) * 100)}%`
        : "0%",
      sub: "Active in last 7 days",
      Icon: Activity,
      color: "bg-emerald-500/15 text-emerald-400",
    },
    {
      label: "Avg progress",
      value: `${data.kpis.avgProgressPct}%`,
      sub: "Lessons completed",
      Icon: TrendingUp,
      color: "bg-sky-500/15 text-sky-400",
    },
    {
      label: "Attendance",
      value: `${data.kpis.attendanceRate}%`,
      sub: `${data.kpis.totalLiveSessions} live sessions`,
      Icon: UserCheck,
      color: "bg-amber-500/15 text-amber-400",
    },
    {
      label: "Watch time",
      value: `${data.kpis.totalWatchHours.toLocaleString()}h`,
      sub: "All students combined",
      Icon: Clock,
      color: "bg-orange-500/15 text-orange-400",
    },
    {
      label: "Pending",
      value: data.kpis.pendingRequests,
      sub: "Join requests waiting",
      Icon: AlertTriangle,
      color: data.kpis.pendingRequests > 0
        ? "bg-red-500/15 text-red-400"
        : "bg-secondary text-muted-foreground",
    },
    {
      label: "Assignments",
      value: data.kpis.totalAssignments,
      sub: "Total created",
      Icon: ClipboardList,
      color: "bg-violet-500/15 text-violet-400",
    },
    {
      label: "Quizzes",
      value: data.kpis.totalQuizzes,
      sub: "Across all lessons",
      Icon: HelpCircle,
      color: "bg-sky-500/15 text-sky-400",
    },
  ];

  return (
    <div className="space-y-4">
      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(({ label, value, sub, Icon, color }) => (
          <div key={label} className="glass p-4 rounded-xl flex flex-col gap-2">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xl font-bold">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Enrollment trend */}
      <div className="glass p-4 rounded-xl">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-sm">Enrollment trend</h3>
            <p className="text-xs text-muted-foreground">Last 30 days, approved members</p>
          </div>
          {enrollDelta !== 0 && (
            <div
              className={`text-xs font-semibold flex items-center gap-1 ${
                enrollDelta > 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {enrollDelta > 0 ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              {Math.abs(enrollDelta)}% vs prev. week
            </div>
          )}
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data.enrollmentTrend}>
            <defs>
              <linearGradient id="classEnrollGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={primary} stopOpacity={0.35} />
                <stop offset="95%" stopColor={primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={gridColor} strokeDasharray="4 4" />
            <XAxis
              dataKey="date"
              tick={{ fill: tickColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(d: string) =>
                new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })
              }
              interval="preserveStartEnd"
              minTickGap={30}
            />
            <YAxis
              tick={{ fill: tickColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              {...tooltipStyle}
              labelFormatter={(d: string) => new Date(d).toLocaleDateString()}
            />
            <Area
              type="monotone"
              dataKey="enrollments"
              stroke={primary}
              strokeWidth={2}
              fill="url(#classEnrollGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Engagement: top + bottom lessons */}
      {data.lessonStats.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-4">
          <LessonTable
            title="Most engaging lessons"
            subtitle="Highest completion %"
            rows={data.topLessons}
            barColor={emerald}
            chartStyle={{ tooltipStyle, tickColor, gridColor }}
            empty="No completions yet."
          />
          <LessonTable
            title="Needs attention"
            subtitle="Lowest completion %"
            rows={data.bottomLessons}
            barColor={red}
            chartStyle={{ tooltipStyle, tickColor, gridColor }}
            empty="No lessons below threshold."
          />
        </div>
      )}

      {/* Quiz performance */}
      {data.quizStats.length > 0 && (
        <div className="glass p-4 rounded-xl">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-amber-400" /> Quiz performance
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left font-medium py-2">Quiz</th>
                  <th className="text-right font-medium py-2">Takers</th>
                  <th className="text-right font-medium py-2">Avg score</th>
                  <th className="text-right font-medium py-2">Pass rate</th>
                  <th className="text-right font-medium py-2">Attempts</th>
                </tr>
              </thead>
              <tbody>
                {data.quizStats.map((q) => (
                  <tr key={q.quizId} className="border-b border-border/40 last:border-0">
                    <td className="py-2 truncate max-w-[260px]">{q.title}</td>
                    <td className="py-2 text-right">{q.takenBy}</td>
                    <td className="py-2 text-right font-medium">{q.avgScore}%</td>
                    <td className="py-2 text-right">
                      <PassRateChip rate={q.passRate} />
                    </td>
                    <td className="py-2 text-right text-muted-foreground">{q.totalAttempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assignment performance */}
      {data.assignmentStats.length > 0 && (
        <div className="glass p-4 rounded-xl">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-amber-400" /> Assignment performance
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left font-medium py-2">Assignment</th>
                  <th className="text-right font-medium py-2">Status</th>
                  <th className="text-right font-medium py-2">Submitted</th>
                  <th className="text-right font-medium py-2">Avg score</th>
                  <th className="text-right font-medium py-2">Pass</th>
                  <th className="text-right font-medium py-2">Late</th>
                </tr>
              </thead>
              <tbody>
                {data.assignmentStats.map((a) => (
                  <tr key={a.assignmentId} className="border-b border-border/40 last:border-0">
                    <td className="py-2 truncate max-w-[240px]">{a.title}</td>
                    <td className="py-2 text-right">
                      <span
                        className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                          a.status === "PUBLISHED"
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-400/30"
                            : a.status === "DRAFT"
                            ? "bg-amber-500/15 text-amber-400 border-amber-400/30"
                            : "bg-secondary text-muted-foreground border-border"
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      {a.submittedCount}{" "}
                      <span className="text-xs text-muted-foreground">
                        ({a.submissionRate}%)
                      </span>
                    </td>
                    <td className="py-2 text-right font-medium">
                      {a.gradedCount ? `${a.avgScore}/${a.maxScore}` : "—"}
                    </td>
                    <td className="py-2 text-right text-emerald-400">{a.passCount}</td>
                    <td className="py-2 text-right text-red-400">{a.lateCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attendance breakdown + per-session */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="glass p-4 rounded-xl">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-amber-400" /> Attendance
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={[
                { label: "Present", value: data.attendance.PRESENT ?? 0, fill: emerald },
                { label: "Late", value: data.attendance.LATE ?? 0, fill: amber },
                { label: "Excused", value: data.attendance.EXCUSED ?? 0, fill: sky },
                { label: "Absent", value: data.attendance.ABSENT ?? 0, fill: red },
              ]}
            >
              <CartesianGrid stroke={gridColor} strokeDasharray="4 4" />
              <XAxis dataKey="label" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {[emerald, amber, sky, red].map((c, i) => (
                  <Cell key={i} fill={c} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass p-4 rounded-xl lg:col-span-2">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Video className="w-4 h-4 text-amber-400" /> Sessions
          </h3>
          {data.sessions.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              No live sessions scheduled.
            </div>
          ) : (
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {data.sessions.map((s) => {
                const attendPct = data.kpis.totalStudents
                  ? Math.round((s.attendees / data.kpis.totalStudents) * 100)
                  : 0;
                return (
                  <div key={s.id} className="flex items-center gap-3 py-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{s.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(s.scheduledAt).toLocaleDateString()} · {s.status}
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="font-medium">{s.attendees} attendees</div>
                      <div className="text-muted-foreground">{attendPct}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Students: top + struggling */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass p-4 rounded-xl">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" /> Top students
          </h3>
          {data.topStudents.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">No students yet.</div>
          ) : (
            <div className="space-y-1">
              {data.topStudents.map((s, i) => (
                <div key={s.userId} className="flex items-center gap-3 py-1">
                  <span className="text-xs font-bold w-5 text-center text-amber-400">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.progressPct}% complete · {s.attendStreak} streak
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{s.xpEarned} XP</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass p-4 rounded-xl">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" /> Needs attention
          </h3>
          {data.struggling.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              No struggling students — great work!
            </div>
          ) : (
            <div className="space-y-1">
              {data.struggling.map((s) => (
                <div key={s.userId} className="flex items-center gap-3 py-1">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.progressPct}% complete
                      {s.lastActiveAt
                        ? ` · last seen ${new Date(s.lastActiveAt).toLocaleDateString()}`
                        : " · never active"}
                    </div>
                  </div>
                  <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-400"
                      style={{ width: `${s.progressPct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function PassRateChip({ rate }: { rate: number }) {
  const cls =
    rate >= 80
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-400/30"
      : rate >= 60
      ? "bg-amber-500/15 text-amber-400 border-amber-400/30"
      : "bg-red-500/15 text-red-400 border-red-400/30";
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cls}`}>
      {rate}%
    </span>
  );
}

function LessonTable({
  title,
  subtitle,
  rows,
  barColor,
  chartStyle,
  empty,
}: {
  title: string;
  subtitle: string;
  rows: LessonRow[];
  barColor: string;
  chartStyle: {
    tooltipStyle: {
      contentStyle: React.CSSProperties;
      labelStyle: React.CSSProperties;
    };
    tickColor: string;
    gridColor: string;
  };
  empty: string;
}) {
  return (
    <div className="glass p-4 rounded-xl">
      <h3 className="font-semibold text-sm mb-0.5">{title}</h3>
      <p className="text-xs text-muted-foreground mb-3">{subtitle}</p>
      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center">{empty}</div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 36)}>
          <BarChart
            data={rows.map((r) => ({ name: r.title, value: r.completionPct }))}
            layout="vertical"
            margin={{ left: 4, right: 16 }}
          >
            <CartesianGrid stroke={chartStyle.gridColor} strokeDasharray="4 4" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fill: chartStyle.tickColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: chartStyle.tickColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={140}
            />
            <Tooltip {...chartStyle.tooltipStyle} formatter={(v: number) => [`${v}%`, "Completion"]} />
            <Bar dataKey="value" fill={barColor} radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
