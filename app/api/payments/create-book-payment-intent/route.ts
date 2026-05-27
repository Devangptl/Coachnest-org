/**
 * POST /api/payments/create-book-payment-intent
 * @deprecated Use /api/razorpay/create-order with { type: "books" } instead.
 *
 * Kept for backward compatibility. Delegates to the new Razorpay create-order endpoint.
 * Body: { couponCode?: string }
 * Response: { razorpayOrderId, dbOrderId, amount, subtotal, discount, itemCount, key }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createBooksRazorpayOrder } from "@/services/book-payment.service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { couponCode?: string } = {};
  try { body = await req.json(); } catch { /* empty body is fine */ }

  try {
    const result = await createBooksRazorpayOrder(session.userId, body.couponCode);
    return NextResponse.json({ ...result, key: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to initialize payment";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
