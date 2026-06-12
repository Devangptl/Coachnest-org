/**
 * GET /api/admin/organizations/revenue — subscription revenue analytics
 * bundle for the platform admin dashboard. SUPER_ADMIN / FINANCE_ADMIN.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getPlatformOrgStats,
  getOrgRevenueByOrg,
  getOrgMonthlyRevenue,
  getOrgSubscriptionBreakdown,
  getOrgUserGrowth,
  getOrgCourseUsage,
} from "@/services/org-analytics.service";

export async function GET() {
  try {
    const session = await getSession();
    if (
      !session ||
      session.role !== "ADMIN" ||
      !["SUPER_ADMIN", "FINANCE_ADMIN"].includes(session.adminSubRole ?? "SUPER_ADMIN")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [stats, byOrg, monthly, breakdown, growth, usage] = await Promise.all([
      getPlatformOrgStats(),
      getOrgRevenueByOrg(10),
      getOrgMonthlyRevenue(6),
      getOrgSubscriptionBreakdown(),
      getOrgUserGrowth(6),
      getOrgCourseUsage(10),
    ]);

    return NextResponse.json({ stats, byOrg, monthly, breakdown, growth, usage });
  } catch (error) {
    console.error("[GET /api/admin/organizations/revenue]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
