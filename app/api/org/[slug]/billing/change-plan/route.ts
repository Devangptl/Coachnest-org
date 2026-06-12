/**
 * POST /api/org/[slug]/billing/change-plan — upgrade (prorated charge now)
 * or downgrade (scheduled at renewal). ORG_ADMIN.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgRole, orgAuthErrorResponse } from "@/lib/org-auth";
import { changePlanSchema } from "@/lib/validation/org";
import { changePlan } from "@/services/org-subscription.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const ctx = await requireOrgRole(slug, ["ORG_ADMIN"], { allowExpired: true });

    const parsed = changePlanSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const result = await changePlan(
      ctx.org.id,
      parsed.data.planId,
      parsed.data.billingCycle,
      ctx.session.userId,
    );
    return NextResponse.json({
      ...result,
      razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error) {
    const res = orgAuthErrorResponse(error);
    if (res) return res;
    console.error("[POST /api/org/[slug]/billing/change-plan]", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
