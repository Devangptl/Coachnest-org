/**
 * GET /api/analytics/admin
 * Returns all dashboard data: stats, revenue chart, top courses, user growth.
 * Admin-only.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getAdminStats,
  getMonthlyRevenue,
  getTopCourses,
  getUserGrowth,
  getRecentOrders,
} from "@/services/analytics.service";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [stats, revenue, topCourses, userGrowth, recentOrders] =
      await Promise.all([
        getAdminStats(),
        getMonthlyRevenue(6),
        getTopCourses(5),
        getUserGrowth(6),
        getRecentOrders(8),
      ]);

    return NextResponse.json({ stats, revenue, topCourses, userGrowth, recentOrders });
  } catch (err) {
    console.error("[GET /api/analytics/admin]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
