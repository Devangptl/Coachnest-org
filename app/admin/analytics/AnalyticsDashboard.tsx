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
  /** True when a dateFrom/dateTo filter is active — totals become range counts. */
  ranged?: boolean;
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
  ranged = false,
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

  const statCards = [
    {
      label: ranged ? "New Users" : "Total Users",
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      color: "bg-blue-500/20 text-blue-400",
      sub: ranged ? "Joined in range" : `${engagement.activeStudents} active this month`,
    },
    {
      label: ranged ? "New Courses" : "Published Courses",
      value: stats.totalCourses.toLocaleString(),
      icon: BookOpen,
      color: "bg-orange-500/15 text-[#d97757]",
      sub: ranged ? "Published, created in range" : `${engagement.avgCompletionRate}% avg completion`,
    },
    {
      label: ranged ? "Enrollments" : "Total Enrollments",
      value: stats.totalEnrollments.toLocaleString(),
      icon: TrendingUp,
      color: "bg-emerald-500/20 text-emerald-400",
      sub: ranged ? "Enrolled in range" : `${engagement.totalLessonsCompleted.toLocaleString()} lessons done`,
    },
    {
      label: ranged ? "Revenue" : "Total Revenue",
      value: `₹${stats.totalRevenue.toLocaleString("en-IN")}`,
      icon: DollarSign,
      color: "bg-amber-500/20 text-amber-400",
      sub: ranged ? "Paid orders in range" : "All-time paid orders",
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
    <div className="space-y-4 md:space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground/70 text-xs sm:text-sm mt-0.5 sm:mt-1">Platform-wide insights</p>
      </div>

      {/* Primary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {statCards.map(({ label, value, icon: Icon, color, sub }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass p-2.5 sm:p-3 md:p-4 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2.5"
          >
            <div className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-md flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground/70 text-[10px] sm:text-[11px] md:text-xs leading-snug truncate">
                {label}
              </p>
              <p className="text-base sm:text-lg md:text-2xl font-bold text-foreground leading-tight truncate">
                {value}
              </p>
              {sub && (
                <p className="text-muted-foreground/50 text-[10px] md:text-xs mt-0.5 leading-tight truncate">
                  {sub}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Engagement cards — 3-up on every breakpoint so they don't waste space on mobile */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {engagementCards.map(({ label, value, icon: Icon, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.06 }}
            className="glass p-2.5 sm:p-3 md:p-4 flex flex-col items-center text-center gap-1 sm:flex-row sm:text-left sm:gap-2.5 md:gap-3"
          >
            <div className={`w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm sm:text-lg md:text-xl font-bold text-foreground leading-tight truncate">{value}</p>
              <p className="text-muted-foreground/70 text-[10px] sm:text-[11px] md:text-xs leading-tight line-clamp-2 sm:line-clamp-none">
                {label}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue">
        <div className="overflow-x-auto pb-1 -mb-1 -mx-1 px-1 scrollbar-hide">
          <TabsList className="w-auto min-w-max gap-0.5 sm:gap-1">
            <TabsTrigger value="revenue" className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap">Revenue</TabsTrigger>
            <TabsTrigger value="enrollments" className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap">Enrollments</TabsTrigger>
            <TabsTrigger value="users" className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap">User Growth</TabsTrigger>
            <TabsTrigger value="completion" className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap">Completion</TabsTrigger>
          </TabsList>
        </div>

        {/* Revenue trend */}
        <TabsContent value="revenue">
          <div className="glass p-3 md:p-4">
            <h3 className="text-foreground font-semibold mb-0.5 text-sm md:text-base">Monthly Revenue</h3>
            <p className="text-muted-foreground/60 text-[11px] sm:text-xs mb-3 md:mb-4">Last 6 months</p>
            <ResponsiveContainer width="100%" height={200} minHeight={180}>
              <AreaChart data={revenue} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={primary} stopOpacity={0.4} />
                    <stop offset="55%" stopColor={primary} stopOpacity={0.12} />
                    <stop offset="100%" stopColor={primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={gridColor} strokeDasharray="4 4" />
                <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: tickColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={42}
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
          <div className="glass p-3 md:p-4">
            <h3 className="text-foreground font-semibold mb-0.5 text-sm md:text-base">Monthly Enrollments vs Revenue</h3>
            <p className="text-muted-foreground/60 text-[11px] sm:text-xs mb-3 md:mb-4">Last 6 months</p>
            <ResponsiveContainer width="100%" height={220} minHeight={200}>
              <LineChart data={combinedTrend} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={gridColor} strokeDasharray="4 4" />
                <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: tickColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: tickColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={42}
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
                  wrapperStyle={{ fontSize: 11, color: tickColor }}
                  iconSize={10}
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
          <div className="glass p-3 md:p-4">
            <h3 className="text-foreground font-semibold mb-0.5 text-sm md:text-base">New User Signups</h3>
            <p className="text-muted-foreground/60 text-[11px] sm:text-xs mb-3 md:mb-4">Last 6 months</p>
            <ResponsiveContainer width="100%" height={200} minHeight={180}>
              <BarChart data={userGrowth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={gridColor} strokeDasharray="4 4" />
                <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
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
          <div className="glass p-3 md:p-4">
            <h3 className="text-foreground font-semibold mb-0.5 text-sm md:text-base">Course Completion Rates</h3>
            <p className="text-muted-foreground/60 text-[11px] sm:text-xs mb-3 md:mb-4">Top courses by enrollment</p>

            {/* Mobile: progress-bar list (chart labels truncate badly on narrow viewports) */}
            <ul className="sm:hidden space-y-3">
              {courseCompletionStats.map((c) => {
                const barColor = c.rate >= 70 ? "bg-emerald-500" : c.rate >= 40 ? "bg-amber-500" : "bg-[#d97757]";
                return (
                  <li key={c.title}>
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <p className="text-foreground text-xs font-medium truncate flex-1">{c.title}</p>
                      <span className="text-[11px] font-semibold tabular-nums text-foreground/90 shrink-0">
                        {c.rate}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${Math.min(100, Math.max(0, c.rate))}%` }}
                      />
                    </div>
                    <p className="text-muted-foreground/60 text-[10px] mt-1">
                      {c.completed}/{c.enrolled} completed
                    </p>
                  </li>
                );
              })}
            </ul>

            {/* sm+: vertical bar chart */}
            <div className="hidden sm:block">
              <ResponsiveContainer width="100%" height={Math.max(260, courseCompletionStats.length * 40)}>
                <BarChart data={courseCompletionStats} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
                  <CartesianGrid stroke={gridColor} strokeDasharray="4 4" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fill: tickColor, fontSize: 11 }}
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
                    width={140}
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
          </div>
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {/* Top Courses */}
        <div className="glass p-3 md:p-4">
          <h3 className="text-foreground font-semibold mb-2.5 md:mb-3 text-sm md:text-base">Top Courses</h3>
          <ul className="space-y-2.5 md:space-y-3">
            {topCourses.map((c, i) => (
              <li key={c.id} className="flex items-center gap-2 md:gap-3">
                <span className="w-6 h-6 rounded-md bg-orange-500/15 text-[#d97757] text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-xs md:text-sm font-medium truncate">{c.title}</p>
                  <div className="flex items-center gap-2 md:gap-3 mt-0.5">
                    <span className="text-muted-foreground/60 text-[10px] md:text-xs">{c.enrollments} students</span>
                    <span className="text-emerald-400 text-[10px] md:text-xs font-medium tabular-nums">
                      ₹{c.revenue.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 text-amber-400 text-[11px] md:text-xs flex-shrink-0 tabular-nums">
                  <Star className="w-3 h-3 fill-current" />
                  {c.avgRating || "—"}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Recent Orders */}
        <div className="glass p-3 md:p-4">
          <h3 className="text-foreground font-semibold mb-2.5 md:mb-3 text-sm md:text-base">Recent Orders</h3>
          <ul className="space-y-2 md:space-y-3">
            {recentOrders.map((o) => (
              <li key={o.id} className="flex items-center gap-2 md:gap-3">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-[11px] md:text-xs font-semibold text-muted-foreground">
                  {o.user?.name?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-xs md:text-sm font-medium truncate">
                    {o.user?.name ?? "—"}
                  </p>
                  <p className="text-muted-foreground/70 text-[10px] md:text-xs truncate">
                    {o.course?.title ?? "Subscription"}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-emerald-400 text-xs md:text-sm font-semibold tabular-nums">
                    ₹{Number(o.amount).toLocaleString("en-IN")}
                  </p>
                  <p className="text-muted-foreground/50 text-[10px] md:text-xs">
                    {format(new Date(o.createdAt), "d MMM")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
