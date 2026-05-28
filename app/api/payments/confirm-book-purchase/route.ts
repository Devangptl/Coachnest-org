/**
 * POST /api/payments/confirm-book-purchase
 * Confirms a book purchase after a successful Razorpay payment.
 * The signature must have already been verified by /api/razorpay/verify-payment.
 *
 * Body: { dbOrderId: string, razorpayPaymentId: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { finalizeBookPayment } from "@/services/book-payment.service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { dbOrderId?: string; razorpayPaymentId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.dbOrderId || !body.razorpayPaymentId) {
    return NextResponse.json(
      { error: "dbOrderId and razorpayPaymentId are required" },
      { status: 400 }
    );
  }

  try {
    const result = await finalizeBookPayment(body.dbOrderId, body.razorpayPaymentId);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Confirmation failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
