/**
 * POST /api/payments/confirm-enrollment
 * Confirms a course enrollment after a successful Razorpay payment.
 * The signature must have already been verified by /api/razorpay/verify-payment.
 *
 * Body: { dbOrderId: string, razorpayPaymentId: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { finalizeCoursePayment } from "@/services/payment.service";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { dbOrderId, razorpayPaymentId } = await req.json() as {
      dbOrderId:         string;
      razorpayPaymentId: string;
    };

    if (!dbOrderId || !razorpayPaymentId) {
      return NextResponse.json(
        { error: "dbOrderId and razorpayPaymentId are required" },
        { status: 400 }
      );
    }

    const result = await finalizeCoursePayment(dbOrderId, razorpayPaymentId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Enrollment confirmation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
