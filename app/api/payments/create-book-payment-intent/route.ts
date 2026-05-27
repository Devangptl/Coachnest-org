/**
 * POST /api/payments/create-book-payment-intent
 * Creates a Stripe PaymentIntent for the signed-in user's cart (no redirect).
 * Body: { couponCode?: string, paymentMethodType?: "card" | "upi" }
 * Response: { clientSecret, orderId, amount, subtotal, discount, itemCount }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createBookPaymentIntent } from "@/services/book-payment.service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { couponCode?: string; paymentMethodType?: string } = {};
  try { body = await req.json(); } catch { /* empty body is fine */ }

  try {
    const result = await createBookPaymentIntent(
      session.userId,
      body.couponCode,
      body.paymentMethodType,
    );
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to initialize payment";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
