/**
 * POST /api/payments/webhook
 * Stripe webhook handler.
 *
 * Handled events:
 *   checkout.session.completed       → one-time course purchase
 *   customer.subscription.created    → new subscription activated
 *   customer.subscription.updated    → plan change / cancellation scheduled
 *   customer.subscription.deleted    → subscription expired / fully cancelled
 *   invoice.payment_failed           → notify user of failed renewal
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/stripe";
import { handlePaymentSuccess } from "@/services/payment.service";
import {
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaymentFailed,
} from "@/services/subscription.service";

export async function POST(req: NextRequest) {
  try {
    const body      = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    const event = verifyWebhookSignature(body, signature);

    switch (event.type) {
      // ── One-time course purchase ──────────────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object;

        // Only handle one-time payments here; subscription sessions are handled
        // by customer.subscription.created below.
        if (session.mode === "payment") {
          const paymentIntentId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id ?? "";
          await handlePaymentSuccess(session.id, paymentIntentId);
        }
        break;
      }

      // ── Subscription lifecycle ─────────────────────────────────────────────
      case "customer.subscription.created":
        await handleSubscriptionCreated(event);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event);
        break;

      // ── Failed renewal payment ─────────────────────────────────────────────
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event);
        break;

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
