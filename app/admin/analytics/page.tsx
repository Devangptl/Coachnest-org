/**
 * /admin/analytics — Admin analytics dashboard.
 */
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  getAdminStats,
  getEngagementMetrics,
  getMonthlyRevenue,
  getTopCourses,
  getUserGrowth,
  getRecentOrders,
  getCourseCompletionStats,
  getMonthlyEnrollments,
} from "@/services/analytics.service";

const AnalyticsDashboard = dynamic(() => import("./AnalyticsDashboard"), {
  loading: () => (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-lg bg-secondary" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-secondary" />
        ))}
      </div>
      <div className="h-80 rounded-lg bg-secondary" />
    </div>
  ),
});

export default async function AnalyticsPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/dashboard");

  const [
    stats,
    engagement,
    revenue,
    topCourses,
    userGrowth,
    recentOrders,
    courseCompletionStats,
    monthlyEnrollments,
  ] = await Promise.all([
    getAdminStats(),
    getEngagementMetrics(),
    getMonthlyRevenue(6),
    getTopCourses(5),
    getUserGrowth(6),
    getRecentOrders(8),
    getCourseCompletionStats(8),
    getMonthlyEnrollments(6),
  ]);

  return (
    <AnalyticsDashboard
      stats={stats}
      engagement={engagement}
      revenue={revenue}
      topCourses={topCourses}
      userGrowth={userGrowth}
      monthlyEnrollments={monthlyEnrollments}
      courseCompletionStats={courseCompletionStats}
      recentOrders={recentOrders.map((o) => ({
        ...o,
        amount: o.amount.toString(),
        createdAt: o.createdAt.toISOString(),
      }))}
    />
  );
}
