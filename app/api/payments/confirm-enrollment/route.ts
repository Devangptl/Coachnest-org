/**
 * POST /api/payments/confirm-enrollment
 * Client-side fallback called immediately after stripe.confirmCardPayment() succeeds.
 * Verifies the PaymentIntent with Stripe and triggers enrollment right away —
 * without waiting for the webhook (which may be delayed or not yet configured).
 *
 * Body: { paymentIntentId: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { handlePaymentIntentSuccess } from "@/services/payment.service";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { paymentIntentId } = await req.json() as { paymentIntentId: string };
    if (!paymentIntentId)
      return NextResponse.json({ error: "paymentIntentId is required" }, { status: 400 });

    // Verify with Stripe that the payment actually succeeded
    const stripe = getStripe();
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (pi.status !== "succeeded" && pi.status !== "processing") {
      return NextResponse.json(
        { error: `Payment not completed (status: ${pi.status})` },
        { status: 400 }
      );
    }

    // Enroll the user — idempotent, safe to call even if webhook already ran
    const result = await handlePaymentIntentSuccess(paymentIntentId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Enrollment confirmation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
