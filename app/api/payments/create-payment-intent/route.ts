/**
 * POST /api/payments/create-payment-intent
 * @deprecated Use /api/razorpay/create-order with { type: "course", courseId } instead.
 *
 * Kept for backward compatibility. Delegates to the new Razorpay create-order endpoint.
 * Body: { courseId, couponCode?, referralCode? }
 * Response: { razorpayOrderId, dbOrderId, amount, currency, key }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createCourseRazorpayOrder } from "@/services/payment.service";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { courseId, couponCode, referralCode } = await req.json() as {
      courseId:       string;
      couponCode?:    string;
      referralCode?:  string;
    };
    if (!courseId) return NextResponse.json({ error: "courseId is required" }, { status: 400 });

    const result = await createCourseRazorpayOrder(
      session.userId, courseId, couponCode, referralCode
    );

    return NextResponse.json({
      ...result,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
