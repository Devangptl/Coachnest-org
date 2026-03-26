/**
 * POST /api/payments/create-order
 * Creates a Stripe Checkout Session for a course purchase.
 * Body: { courseId, couponCode? }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createCheckoutSession } from "@/services/payment.service";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { courseId, couponCode } = await req.json();
    if (!courseId)
      return NextResponse.json(
        { error: "courseId is required" },
        { status: 400 }
      );

    const result = await createCheckoutSession(
      session.userId,
      courseId,
      couponCode
    );
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
