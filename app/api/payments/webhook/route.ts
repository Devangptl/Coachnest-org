/**
 * POST /api/payments/webhook
 * Stripe webhook handler — subscription lifecycle events only.
 *
 * NOTE: One-time payment webhooks (checkout.session.completed,
 * payment_intent.succeeded) are no longer needed — payments are now
 * processed via Razorpay Standard Checkout and verified inline at
 * POST /api/razorpay/verify-payment.
 *
 * This handler retains Stripe subscription webhooks so that billing plans
 * continue to work correctly.
 *
 * Handled events:
 *   customer.subscription.created    → new subscription activated
 *   customer.subscription.updated    → plan change / cancellation scheduled
 *   customer.subscription.deleted    → subscription expired / fully cancelled
 *   invoice.payment_failed           → notify user of failed renewal
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/stripe";
import {
  handleSubscriptionCheckoutCompleted,
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
      // ── Subscription checkout completed ───────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription") {
          await handleSubscriptionCheckoutCompleted(session);
        }
        // Payment mode sessions are now handled by Razorpay — no-op here.
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
    const message = err instanceof Error ? err.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
