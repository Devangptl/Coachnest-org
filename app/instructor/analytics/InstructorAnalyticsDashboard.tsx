"use client";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Cell,
} from "recharts";
import { BookOpen, Users, Star, TrendingUp, DollarSign, Target } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { useTheme } from "@/components/ThemeProvider";

interface CourseRow {
  id: string;
  title: string;
  enrollments: number;
  revenue: number;
  avgRating: number;
}

interface ProgressStat {
  title: string;
  enrolled: number;
  notStarted: number;
  inProgress: number;
  nearDone: number;
  completed: number;
  completionRate: number;
}

interface QuizStat {
  title: string;
  attempts: number;
  passRate: number;
  avgScore: number;
}

interface Props {
  totalCourses: number;
  totalStudents: number;
  totalRevenue: number;
  avgRating: number;
  courses: CourseRow[];
  monthlyEnrollments: { month: string; enrollments: number }[];
  courseProgressStats: ProgressStat[];
  quizStats: QuizStat[];
}

export default function InstructorAnalyticsDashboard({
  totalCourses,
  totalStudents,
  totalRevenue,
  avgRating,
  courses,
  monthlyEnrollments,
  courseProgressStats,
  quizStats,
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
    labelStyle: { color: isLight ? "#b45309" : "#fbbf24", fontWeight: 600 },
  };

  const tickColor = isLight ? "#685e55" : "#94a3b8";
  const gridColor = isLight ? "rgba(24,19,16,.06)" : "rgba(255,255,255,.06)";
  const amber = "#f59e0b";
  const emerald = "#10b981";
  const blue = "#3b82f6";
  const orange = "#f97316";

  const summaryCards = [
    {
      label: "Total Courses",
      value: totalCourses,
      icon: BookOpen,
      color: "bg-blue-500/15 text-blue-400",
      sub: `${courses.filter((c) => c.enrollments > 0).length} with students`,
    },
    {
      label: "Total Students",
      value: totalStudents.toLocaleString(),
      icon: Users,
      color: "bg-violet-500/15 text-violet-400",
      sub: "All-time enrollments",
    },
    {
      label: "Total Revenue",
      value: `₹${totalRevenue.toLocaleString("en-IN")}`,
      icon: DollarSign,
      color: "bg-emerald-500/15 text-emerald-400",
      sub: "From paid orders",
    },
    {
      label: "Avg Rating",
      value: avgRating ? `${avgRating.toFixed(1)} ★` : "—",
      icon: Star,
      color: "bg-amber-500/15 text-amber-400",
      sub: "Across all courses",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Performance overview of your courses</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {summaryCards.map(({ label, value, icon: Icon, color, sub }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass p-4 flex flex-col gap-3"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-muted-foreground text-sm">{label}</p>
              {sub && <p className="text-muted-foreground/50 text-xs mt-0.5">{sub}</p>}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <Tabs defaultValue="enrollments">
        <TabsList className="w-auto">
          <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
          <TabsTrigger value="progress">Student Progress</TabsTrigger>
          {quizStats.length > 0 && <TabsTrigger value="quizzes">Quiz Stats</TabsTrigger>}
        </TabsList>

        {/* Monthly enrollment trend */}
        <TabsContent value="enrollments">
          <div className="glass p-6">
            <h3 className="text-foreground font-semibold mb-1">Monthly Enrollments</h3>
            <p className="text-muted-foreground/60 text-xs mb-6">New students per month across all your courses</p>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyEnrollments}>
                <defs>
                  <linearGradient id="enrollGradInstructor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={amber} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={amber} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={gridColor} strokeDasharray="4 4" />
                <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: tickColor, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [v, "Enrollments"]} />
                <Area
                  dataKey="enrollments"
                  stroke={amber}
                  strokeWidth={2.5}
                  fill="url(#enrollGradInstructor)"
                  dot={{ r: 3, fill: amber }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* Student progress distribution per course */}
        <TabsContent value="progress">
          <div className="glass p-6">
            <h3 className="text-foreground font-semibold mb-1">Student Progress by Course</h3>
            <p className="text-muted-foreground/60 text-xs mb-6">
              Distribution: Not Started · In Progress (1–49%) · Near Done (50–99%) · Completed
            </p>
            {courseProgressStats.length === 0 ? (
              <p className="text-muted-foreground/60 text-sm text-center py-8">
                No published courses with enrolled students yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(240, courseProgressStats.length * 52)}>
                <BarChart
                  data={courseProgressStats}
                  layout="vertical"
                  margin={{ left: 12, right: 24 }}
                >
                  <CartesianGrid stroke={gridColor} strokeDasharray="4 4" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: tickColor, fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="title"
                    tick={{ fill: tickColor, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={120}
                  />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(v: number, name: string) => {
                      const labels: Record<string, string> = {
                        notStarted: "Not Started",
                        inProgress: "In Progress",
                        nearDone: "Near Done",
                        completed: "Completed",
                      };
                      return [v, labels[name] ?? name];
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: tickColor }}
                    formatter={(v) => {
                      const labels: Record<string, string> = {
                        notStarted: "Not Started",
                        inProgress: "In Progress",
                        nearDone: "Near Done",
                        completed: "Completed",
                      };
                      return labels[v] ?? v;
                    }}
                  />
                  <Bar dataKey="notStarted" stackId="a" fill={isLight ? "#d1d5db" : "#334155"} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="inProgress" stackId="a" fill={blue} opacity={0.8} />
                  <Bar dataKey="nearDone"   stackId="a" fill={amber} opacity={0.8} />
                  <Bar dataKey="completed"  stackId="a" fill={emerald} opacity={0.9} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </TabsContent>

        {/* Quiz pass rates */}
        {quizStats.length > 0 && (
          <TabsContent value="quizzes">
            <div className="glass p-6">
              <h3 className="text-foreground font-semibold mb-1">Quiz Performance</h3>
              <p className="text-muted-foreground/60 text-xs mb-6">Pass rate and average score per course</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={quizStats} margin={{ left: 4, right: 16 }}>
                  <CartesianGrid stroke={gridColor} strokeDasharray="4 4" />
                  <XAxis dataKey="title" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: tickColor, fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(v: number, name: string) => [
                      `${v}%`,
                      name === "passRate" ? "Pass Rate" : "Avg Score",
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: tickColor }}
                    formatter={(v) => (v === "passRate" ? "Pass Rate" : "Avg Score")}
                  />
                  <Bar dataKey="passRate" fill={emerald} opacity={0.85} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avgScore" fill={orange} opacity={0.75} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Per-course breakdown table */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Course Breakdown</h2>
        {courses.length === 0 ? (
          <div className="glass p-12 text-center">
            <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No courses yet. Create your first course to see analytics.</p>
          </div>
        ) : (
          <div className="glass overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 border-b border-border">
              <div className="col-span-5">Course</div>
              <div className="col-span-2 text-center">Students</div>
              <div className="col-span-3 text-center">Revenue</div>
              <div className="col-span-2 text-center">Rating</div>
            </div>
            <div className="divide-y divide-border/50">
              {courses.map((course, i) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.05 + i * 0.04 }}
                  className="grid grid-cols-12 gap-3 px-4 py-3.5 items-center"
                >
                  <div className="col-span-5 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{course.title}</p>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="text-sm font-semibold text-foreground">{course.enrollments}</span>
                  </div>
                  <div className="col-span-3 text-center">
                    <span className="text-sm font-semibold text-emerald-400">
                      {course.revenue > 0
                        ? `₹${course.revenue.toLocaleString("en-IN")}`
                        : <span className="text-muted-foreground/40">—</span>}
                    </span>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="text-sm font-medium text-amber-400">
                      {course.avgRating ? (
                        <span className="flex items-center justify-center gap-0.5">
                          <Star className="w-3 h-3 fill-current" />
                          {course.avgRating}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Completion rate summary */}
      {courseProgressStats.length > 0 && (
        <div className="glass p-6">
          <h3 className="text-foreground font-semibold mb-5 flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-400" />
            Completion Rates
          </h3>
          <div className="space-y-3">
            {courseProgressStats.map((c, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-foreground text-sm font-medium truncate pr-4">{c.title}</p>
                    <span className={`text-xs font-semibold flex-shrink-0 ${
                      c.completionRate >= 70 ? "text-emerald-400" : c.completionRate >= 40 ? "text-amber-400" : "text-muted-foreground/60"
                    }`}>
                      {c.completionRate}%
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${c.completionRate}%` }}
                      transition={{ duration: 0.8, delay: 0.15 + i * 0.06, ease: "easeOut" }}
                      className={`h-full rounded-full ${
                        c.completionRate >= 70
                          ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                          : c.completionRate >= 40
                          ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                          : "bg-gradient-to-r from-slate-500 to-slate-400"
                      }`}
                    />
                  </div>
                  <p className="text-muted-foreground/50 text-xs mt-1">
                    {c.completed} / {c.enrolled} students completed
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
