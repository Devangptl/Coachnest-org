/**
 * GET /api/org/[slug]/billing/transactions — paginated billing history.
 * ORG_ADMIN; works while expired.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgPermission, orgAuthErrorResponse } from "@/lib/org-auth";
import { listOrgTransactions } from "@/services/org-subscription.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const ctx = await requireOrgPermission(slug, "billing:view", { allowExpired: true });

    const page = Number(req.nextUrl.searchParams.get("page") ?? "1");
    const result = await listOrgTransactions(ctx.org.id, { page });
    return NextResponse.json(result);
  } catch (error) {
    const res = orgAuthErrorResponse(error);
    if (res) return res;
    console.error("[GET /api/org/[slug]/billing/transactions]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
