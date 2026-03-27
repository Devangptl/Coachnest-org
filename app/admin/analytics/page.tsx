/**
 * /admin/analytics — Admin analytics dashboard.
 */
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  getAdminStats, getMonthlyRevenue, getTopCourses,
  getUserGrowth, getRecentOrders,
} from "@/services/analytics.service";

// Lazy-load the dashboard (bundles recharts + framer-motion only when needed)
const AnalyticsDashboard = dynamic(() => import("./AnalyticsDashboard"), {
  loading: () => (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-lg bg-secondary" />
        ))}
      </div>
      <div className="h-80 rounded-lg bg-secondary" />
    </div>
  ),
});

export default async function AnalyticsPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/dashboard");

  const [stats, revenue, topCourses, userGrowth, recentOrders] = await Promise.all([
    getAdminStats(),
    getMonthlyRevenue(6),
    getTopCourses(5),
    getUserGrowth(6),
    getRecentOrders(8),
  ]);

  return (
    <AnalyticsDashboard
      stats={stats}
      revenue={revenue}
      topCourses={topCourses}
      userGrowth={userGrowth}
      recentOrders={recentOrders.map((o) => ({
        ...o,
        amount:    o.amount.toString(),
        createdAt: o.createdAt.toISOString(),
      }))}
    />
  );
}
