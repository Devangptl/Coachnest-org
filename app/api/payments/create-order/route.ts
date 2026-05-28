/**
 * POST /api/payments/create-order
 * @deprecated Use /api/razorpay/create-order instead.
 *
 * Creates a Razorpay order for a course purchase.
 * Body: { courseId, couponCode?, referralCode? }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createCourseRazorpayOrder } from "@/services/payment.service";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { courseId, couponCode, referralCode } = await req.json();
    if (!courseId)
      return NextResponse.json({ error: "courseId is required" }, { status: 400 });

    const result = await createCourseRazorpayOrder(
      session.userId, courseId, couponCode, referralCode
    );
    return NextResponse.json({ ...result, key: process.env.RAZORPAY_KEY_ID });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
