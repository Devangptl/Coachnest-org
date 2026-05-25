"use client";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  Cell,
} from "recharts";
import {
  Users, BookOpen, TrendingUp, DollarSign, Star,
  Activity, CheckCircle, GraduationCap,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { format } from "date-fns";
import { useTheme } from "@/components/ThemeProvider";

interface Props {
  stats: {
    totalUsers: number;
    totalCourses: number;
    totalEnrollments: number;
    totalRevenue: number;
  };
  engagement: {
    activeStudents: number;
    totalLessonsCompleted: number;
    avgCompletionRate: number;
  };
  revenue: { month: string; revenue: number }[];
  topCourses: {
    id: string;
    title: string;
    enrollments: number;
    revenue: number;
    avgRating: number;
  }[];
  userGrowth: { month: string; users: number }[];
  monthlyEnrollments: { month: string; enrollments: number }[];
  courseCompletionStats: {
    title: string;
    enrolled: number;
    completed: number;
    rate: number;
  }[];
  recentOrders: {
    id: string;
    amount: string;
    currency: string;
    createdAt: string;
    user: { name: string; email: string } | null;
    course: { title: string } | null;
  }[];
}

export default function AnalyticsDashboard({
  stats,
  engagement,
  revenue,
  topCourses,
  userGrowth,
  monthlyEnrollments,
  courseCompletionStats,
  recentOrders,
}: Props) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  const bg = isLight ? "#ffffff" : "#1a1535";

  const tooltipStyle = {
    contentStyle: {
      background: bg,
      border: `1px solid ${isLight ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.1)"}`,
      borderRadius: 12,
      color: isLight ? "#181310" : "#f1f5f9",
      fontSize: 13,
      boxShadow: isLight ? "0 4px 24px rgba(0,0,0,.09)" : "0 4px 24px rgba(0,0,0,.5)",
    },
    labelStyle: { color: isLight ? "#ea580c" : "#fb923c", fontWeight: 700 },
    cursor: { stroke: isLight ? "rgba(0,0,0,.06)" : "rgba(255,255,255,.06)", strokeWidth: 1 },
  };

  const tickColor   = isLight ? "#6b7280" : "#94a3b8";
  const gridColor   = isLight ? "rgba(0,0,0,.05)" : "rgba(255,255,255,.05)";
  const primary     = isLight ? "#ea580c" : "#fb923c";
  const blue        = isLight ? "#3b82f6" : "#60a5fa";
  const emerald     = isLight ? "#10b981" : "#34d399";
  const amber       = isLight ? "#f59e0b" : "#fbbf24";
  const mutedFill   = isLight ? "#cbd5e1" : "#334155";

  const statCards = [
    {
      label: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      color: "bg-blue-500/20 text-blue-400",
      sub: `${engagement.activeStudents} active this month`,
    },
    {
      label: "Published Courses",
      value: stats.totalCourses.toLocaleString(),
      icon: BookOpen,
      color: "bg-orange-500/15 text-[#d97757]",
      sub: `${engagement.avgCompletionRate}% avg completion`,
    },
    {
      label: "Total Enrollments",
      value: stats.totalEnrollments.toLocaleString(),
      icon: TrendingUp,
      color: "bg-emerald-500/20 text-emerald-400",
      sub: `${engagement.totalLessonsCompleted.toLocaleString()} lessons done`,
    },
    {
      label: "Total Revenue",
      value: `₹${stats.totalRevenue.toLocaleString("en-IN")}`,
      icon: DollarSign,
      color: "bg-amber-500/20 text-amber-400",
      sub: "All-time paid orders",
    },
  ];

  const engagementCards = [
    {
      label: "Active Students (30d)",
      value: engagement.activeStudents.toLocaleString(),
      icon: Activity,
      color: "bg-violet-500/20 text-violet-400",
    },
    {
      label: "Lessons Completed",
      value: engagement.totalLessonsCompleted.toLocaleString(),
      icon: CheckCircle,
      color: "bg-teal-500/20 text-teal-400",
    },
    {
      label: "Avg Completion Rate",
      value: `${engagement.avgCompletionRate}%`,
      icon: GraduationCap,
      color: "bg-pink-500/20 text-pink-400",
    },
  ];

  // Merge revenue + enrollments for combo chart
  const combinedTrend = revenue.map((r, i) => ({
    month: r.month,
    revenue: r.revenue,
    enrollments: monthlyEnrollments[i]?.enrollments ?? 0,
  }));

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground/70 text-sm mt-1">Platform-wide insights</p>
      </div>

      {/* Primary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(({ label, value, icon: Icon, color, sub }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="stat-card"
          >
            <div className={`stat-icon ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-muted-foreground/70 text-xs">{label}</p>
              {sub && <p className="text-muted-foreground/50 text-[11px] mt-0.5">{sub}</p>}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Engagement cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {engagementCards.map(({ label, value, icon: Icon, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.06 }}
            className="glass p-4 flex items-center gap-4"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{value}</p>
              <p className="text-muted-foreground/70 text-xs">{label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue">
        <div className="overflow-x-auto pb-1 -mb-1">
          <TabsList className="w-auto min-w-max">
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
            <TabsTrigger value="users">User Growth</TabsTrigger>
            <TabsTrigger value="completion">Course Completion</TabsTrigger>
          </TabsList>
        </div>

        {/* Revenue trend */}
        <TabsContent value="revenue">
          <div className="glass p-4">
            <h3 className="text-foreground font-semibold mb-1">Monthly Revenue</h3>
            <p className="text-muted-foreground/60 text-xs mb-4">Last 6 months</p>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenue}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={primary} stopOpacity={0.4} />
                    <stop offset="55%" stopColor={primary} stopOpacity={0.12} />
                    <stop offset="100%" stopColor={primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={gridColor} strokeDasharray="4 4" />
                <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: tickColor, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]}
                />
                <Area dataKey="revenue" stroke={primary} strokeWidth={2.5} fill="url(#revGrad)" dot={{ r: 4, fill: primary, stroke: bg, strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* Enrollments trend */}
        <TabsContent value="enrollments">
          <div className="glass p-4">
            <h3 className="text-foreground font-semibold mb-1">Monthly Enrollments vs Revenue</h3>
            <p className="text-muted-foreground/60 text-xs mb-4">Last 6 months</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={combinedTrend}>
                <CartesianGrid stroke={gridColor} strokeDasharray="4 4" />
                <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: tickColor, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: tickColor, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v: number, name: string) =>
                    name === "revenue"
                      ? [`₹${v.toLocaleString("en-IN")}`, "Revenue"]
                      : [v, "Enrollments"]
                  }
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: tickColor }}
                  formatter={(v) => (v === "revenue" ? "Revenue (₹)" : "Enrollments")}
                />
                <Line
                  yAxisId="left"
                  dataKey="enrollments"
                  stroke={blue}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: blue, stroke: bg, strokeWidth: 2 }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                />
                <Line
                  yAxisId="right"
                  dataKey="revenue"
                  stroke={primary}
                  strokeWidth={2.5}
                  strokeDasharray="5 3"
                  dot={{ r: 4, fill: primary, stroke: bg, strokeWidth: 2 }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* User growth */}
        <TabsContent value="users">
          <div className="glass p-4">
            <h3 className="text-foreground font-semibold mb-1">New User Signups</h3>
            <p className="text-muted-foreground/60 text-xs mb-4">Last 6 months</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={userGrowth}>
                <CartesianGrid stroke={gridColor} strokeDasharray="4 4" />
                <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: tickColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [v, "New Users"]} />
                <Bar dataKey="users" radius={[6, 6, 0, 0]}>
                  {userGrowth.map((_, i) => (
                    <Cell key={i} fill={primary} opacity={0.3 + (i / Math.max(userGrowth.length - 1, 1)) * 0.7} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* Course completion rates */}
        <TabsContent value="completion">
          <div className="glass p-4">
            <h3 className="text-foreground font-semibold mb-1">Course Completion Rates</h3>
            <p className="text-muted-foreground/60 text-xs mb-4">Top courses by enrollment</p>
            <ResponsiveContainer width="100%" height={Math.max(300, courseCompletionStats.length * 46)}>
              <BarChart data={courseCompletionStats} layout="vertical" margin={{ left: 12, right: 24 }}>
                <CartesianGrid stroke={gridColor} strokeDasharray="4 4" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fill: tickColor, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="title"
                  tick={{ fill: tickColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={110}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v: number, name: string) =>
                    name === "rate" ? [`${v}%`, "Completion Rate"] : [v, name === "enrolled" ? "Enrolled" : "Completed"]
                  }
                />
                <Bar dataKey="rate" radius={[0, 6, 6, 0]}>
                  {courseCompletionStats.map((c, i) => (
                    <Cell
                      key={i}
                      fill={c.rate >= 70 ? emerald : c.rate >= 40 ? amber : primary}
                      opacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
      </Tabs>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Top Courses */}
        <div className="glass p-4">
          <h3 className="text-foreground font-semibold mb-3">Top Courses</h3>
          <div className="space-y-4">
            {topCourses.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-orange-500/15 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-medium truncate">{c.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-muted-foreground/60 text-xs">{c.enrollments} students</span>
                    <span className="text-emerald-400 text-xs font-medium">
                      ₹{c.revenue.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-amber-400 text-xs flex-shrink-0">
                  <Star className="w-3 h-3 fill-current" />
                  {c.avgRating || "—"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="glass p-4">
          <h3 className="text-foreground font-semibold mb-3">Recent Orders</h3>
          <div className="space-y-3">
            {recentOrders.map((o) => (
              <div key={o.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-xs font-semibold text-muted-foreground">
                  {o.user?.name?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-medium truncate">
                    {o.user?.name ?? "—"}
                  </p>
                  <p className="text-muted-foreground/70 text-xs truncate">
                    {o.course?.title ?? "Subscription"}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-emerald-400 text-sm font-semibold">
                    ₹{Number(o.amount).toLocaleString("en-IN")}
                  </p>
                  <p className="text-muted-foreground/50 text-xs">
                    {format(new Date(o.createdAt), "d MMM")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
