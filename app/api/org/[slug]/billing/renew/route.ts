/**
 * POST /api/org/[slug]/billing/renew — create a renewal payment order.
 * ORG_ADMIN; works while expired (that's the point of renewing).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgPermission, orgAuthErrorResponse } from "@/lib/org-auth";
import { createRenewalOrder } from "@/services/org-subscription.service";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const ctx = await requireOrgPermission(slug, "billing:manage", { allowExpired: true });

    const result = await createRenewalOrder(ctx.org.id, ctx.session.userId);
    return NextResponse.json({
      ...result,
      razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error) {
    const res = orgAuthErrorResponse(error);
    if (res) return res;
    console.error("[POST /api/org/[slug]/billing/renew]", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
