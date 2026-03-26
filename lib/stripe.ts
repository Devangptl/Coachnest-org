/**
 * Stripe client — server-only.
 * Import only in API routes and server actions, never in Client Components.
 */
import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY must be set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-03-25.dahlia",
    });
  }
  return _stripe;
}

/**
 * Verify a Stripe webhook signature.
 * Returns the parsed event or throws on invalid signature.
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET must be set");
  return getStripe().webhooks.constructEvent(payload, signature, secret);
}
