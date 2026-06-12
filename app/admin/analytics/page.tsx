/**
 * /admin/analytics — Admin analytics dashboard.
 */
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import GlassCard from "@/components/GlassCard";
import { UrlDateRangeFilter } from "@/components/ui/DateRangeFilter";
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
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 md:h-24 rounded-lg bg-secondary" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 md:h-20 rounded-lg bg-secondary" />
        ))}
      </div>
      <div className="h-12 w-64 rounded-lg bg-secondary" />
      <div className="h-64 md:h-72 rounded-lg bg-secondary" />
      <div className="grid md:grid-cols-2 gap-3">
        <div className="h-52 rounded-lg bg-secondary" />
        <div className="h-52 rounded-lg bg-secondary" />
      </div>
    </div>
  ),
});

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/dashboard");

  const { dateFrom, dateTo } = await searchParams;
  const filters = { dateFrom, dateTo };
  const ranged = Boolean(dateFrom || dateTo);

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
    getAdminStats(filters),
    getEngagementMetrics(),
    getMonthlyRevenue(6),
    getTopCourses(5, filters),
    getUserGrowth(6),
    getRecentOrders(8, filters),
    getCourseCompletionStats(8, filters),
    getMonthlyEnrollments(6),
  ]);

  return (
    <div className="space-y-6">
      <GlassCard padding="md">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Date range — applies to totals, top courses, completions &amp; recent orders
        </p>
        <UrlDateRangeFilter />
      </GlassCard>

      <AnalyticsDashboard
        ranged={ranged}
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
    </div>
  );
}
