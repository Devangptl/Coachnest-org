/**
 * POST /api/payments/confirm-book-purchase
 * Client-side fallback called immediately after stripe.confirmPayment() succeeds.
 * Verifies the PaymentIntent with Stripe and finalizes the BookOrder + creates
 * BookPurchase rows — without waiting for the webhook.
 *
 * Body: { paymentIntentId: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { handleBookPaymentIntentSuccess } from "@/services/book-payment.service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { paymentIntentId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body.paymentIntentId) {
    return NextResponse.json({ error: "paymentIntentId is required" }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const pi = await stripe.paymentIntents.retrieve(body.paymentIntentId);
    if (pi.status !== "succeeded" && pi.status !== "processing") {
      return NextResponse.json(
        { error: `Payment not completed (status: ${pi.status})` },
        { status: 400 },
      );
    }
    const result = await handleBookPaymentIntentSuccess(body.paymentIntentId);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Confirmation failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
