/**
 * POST /api/payments/verify
 * Client-side fallback: checks payment status via Stripe session ID.
 * The primary enrollment flow is handled by the webhook.
 * Body: { sessionId }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { handlePaymentSuccess } from "@/services/payment.service";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId" },
        { status: 400 }
      );
    }

    // Retrieve the Checkout Session from Stripe
    const stripe = getStripe();
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);

    if (checkoutSession.payment_status === "paid") {
      const paymentIntentId =
        typeof checkoutSession.payment_intent === "string"
          ? checkoutSession.payment_intent
          : checkoutSession.payment_intent?.id || "";

      const result = await handlePaymentSuccess(sessionId, paymentIntentId);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Payment not completed" },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Payment verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
