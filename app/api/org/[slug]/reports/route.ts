/**
 * GET /api/org/[slug]/reports — org-scoped reporting bundle for the
 * ORG_ADMIN reports page: headline stats, per-course completion,
 * enrollment trend.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgRole, orgAuthErrorResponse } from "@/lib/org-auth";
import {
  getOrgDashboardStats,
  getOrgCourseCompletion,
  getOrgEnrollmentTrends,
} from "@/services/org-analytics.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const ctx = await requireOrgRole(slug, ["ORG_ADMIN"], { allowExpired: true });

    const [stats, completion, trends] = await Promise.all([
      getOrgDashboardStats(ctx.org.id),
      getOrgCourseCompletion(ctx.org.id),
      getOrgEnrollmentTrends(ctx.org.id),
    ]);

    return NextResponse.json({ stats, completion, trends });
  } catch (error) {
    const res = orgAuthErrorResponse(error);
    if (res) return res;
    console.error("[GET /api/org/[slug]/reports]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
