/**
 * POST /api/payments/verify
 * Verifies a Razorpay payment and enrolls the student.
 * Body: { razorpayOrderId, razorpayPaymentId, razorpaySignature }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { verifyAndEnroll } from "@/services/payment.service";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = await req.json();
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });
    }

    const result = await verifyAndEnroll(
      session.userId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Payment verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
