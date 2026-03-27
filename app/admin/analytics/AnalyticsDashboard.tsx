"use client";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Users, BookOpen, TrendingUp, DollarSign, Star } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { format } from "date-fns";

interface Props {
  stats:       { totalUsers: number; totalCourses: number; totalEnrollments: number; totalRevenue: number };
  revenue:     { month: string; revenue: number }[];
  topCourses:  { id: string; title: string; enrollments: number; revenue: number; avgRating: number }[];
  userGrowth:  { month: string; users: number }[];
  recentOrders: { id: string; amount: string; currency: string; createdAt: string;
                  user: { name: string; email: string } | null;
                  course: { title: string } | null }[];
}

const STAT_CARDS = (stats: Props["stats"]) => [
  { label: "Total Users",       value: stats.totalUsers.toLocaleString(),           icon: Users,       color: "bg-blue-500/20   text-blue-400"    },
  { label: "Published Courses", value: stats.totalCourses.toLocaleString(),         icon: BookOpen,    color: "bg-orange-500/15 text-orange-400"  },
  { label: "Total Enrollments", value: stats.totalEnrollments.toLocaleString(),     icon: TrendingUp,  color: "bg-emerald-500/20 text-emerald-400" },
  { label: "Total Revenue",     value: `₹${stats.totalRevenue.toLocaleString("en-IN")}`, icon: DollarSign, color: "bg-amber-500/20  text-amber-400"   },
];

const TOOLTIP_STYLE = {
  contentStyle: { background: "#1a1636", border: "1px solid rgba(255,255,255,.15)", borderRadius: 12, color: "#fff" },
  labelStyle:   { color: "#a78bfa" },
};

export default function AnalyticsDashboard({ stats, revenue, topCourses, userGrowth, recentOrders }: Props) {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <p className="text-muted-foreground/70 text-sm mt-1">Platform-wide insights</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS(stats).map(({ label, value, icon: Icon, color }, i) => (
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
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-muted-foreground/70 text-xs">{label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue">
        <TabsList className="w-auto">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="users">User Growth</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <div className="glass p-6">
            <h3 className="text-white font-semibold mb-6">Monthly Revenue (last 6 months)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenue}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,.06)" strokeDasharray="4 4" />
                <XAxis dataKey="month"   tick={{ fill: "#a78bfa", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#a78bfa", fontSize: 12 }} axisLine={false} tickLine={false}
                       tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]} />
                <Area dataKey="revenue" stroke="#7c3aed" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <div className="glass p-6">
            <h3 className="text-white font-semibold mb-6">New Users (last 6 months)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={userGrowth}>
                <CartesianGrid stroke="rgba(255,255,255,.06)" strokeDasharray="4 4" />
                <XAxis dataKey="month" tick={{ fill: "#a78bfa", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#a78bfa", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [v, "New Users"]} />
                <Bar dataKey="users" fill="#7c3aed" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
      </Tabs>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Courses */}
        <div className="glass p-6">
          <h3 className="text-white font-semibold mb-5">Top Courses</h3>
          <div className="space-y-3">
            {topCourses.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-orange-500/15 text-orange-300 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{c.title}</p>
                  <p className="text-muted-foreground/70 text-xs">{c.enrollments} students</p>
                </div>
                <div className="flex items-center gap-1 text-amber-400 text-xs">
                  <Star className="w-3 h-3 fill-current" />
                  {c.avgRating}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="glass p-6">
          <h3 className="text-white font-semibold mb-5">Recent Orders</h3>
          <div className="space-y-3">
            {recentOrders.map((o) => (
              <div key={o.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
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
                  <p className="text-white/30 text-xs">
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
