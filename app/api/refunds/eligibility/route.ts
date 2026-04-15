/**
 * GET /api/refunds/eligibility?orderId=xxx
 * Returns refund eligibility + breakdown for a given order.
 * Used by the student UI to show the refund modal before submitting.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { checkRefundEligibility } from "@/services/refund.service";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const orderId = req.nextUrl.searchParams.get("orderId");
    if (!orderId) {
      return NextResponse.json({ error: "orderId is required." }, { status: 400 });
    }

    const eligibility = await checkRefundEligibility(session.userId, orderId);
    return NextResponse.json({ data: eligibility });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error.";
    const status = msg.includes("Unauthorized") ? 403
                 : msg.includes("not found")    ? 404
                 : 500;
    console.error("[GET /api/refunds/eligibility]", err);
    return NextResponse.json({ error: msg }, { status });
  }
}
