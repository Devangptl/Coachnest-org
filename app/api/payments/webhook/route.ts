/**
 * POST /api/payments/webhook
 * Stripe webhook handler — processes checkout.session.completed events
 * to mark orders as paid and enroll students.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/stripe";
import { handlePaymentSuccess } from "@/services/payment.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    const event = verifyWebhookSignature(body, signature);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id || "";

        await handlePaymentSuccess(session.id, paymentIntentId);
        break;
      }

      default:
        // Unhandled event type — acknowledge receipt
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    console.error("[stripe:webhook]", err);
    const message =
      err instanceof Error ? err.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
