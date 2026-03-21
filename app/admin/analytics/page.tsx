/**
 * /admin/analytics — Admin analytics dashboard.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  getAdminStats, getMonthlyRevenue, getTopCourses,
  getUserGrowth, getRecentOrders,
} from "@/services/analytics.service";
import AnalyticsDashboard from "./AnalyticsDashboard";

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
