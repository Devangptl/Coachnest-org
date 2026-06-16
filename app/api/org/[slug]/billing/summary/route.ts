/**
 * GET /api/org/[slug]/billing/summary — current plan, period, pending payment.
 * ORG_ADMIN; works while expired so the admin can renew.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgPermission, orgAuthErrorResponse } from "@/lib/org-auth";
import { getBillingSummary } from "@/services/org-subscription.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const ctx = await requireOrgPermission(slug, "billing:view", { allowExpired: true });
    const summary = await getBillingSummary(ctx.org.id);
    return NextResponse.json({ ...summary, orgStatus: ctx.org.status });
  } catch (error) {
    const res = orgAuthErrorResponse(error);
    if (res) return res;
    console.error("[GET /api/org/[slug]/billing/summary]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
