/**
 * POST /api/subscriptions/checkout
 * Creates a Stripe Subscription Checkout Session.
 * Body: { plan: "BASIC" | "PRO" | "ENTERPRISE", billing: "monthly" | "yearly" }
 * Returns: { url: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createSubscriptionCheckout } from "@/services/subscription.service";

/** Returns 410 for students — the platform uses direct-purchase, not subscriptions. */
export async function POST() {
  return NextResponse.json(
    {
      error: "Subscription plans are no longer available. Please purchase courses or enrollments directly.",
      code: "SUBSCRIPTION_MODEL_REMOVED",
    },
    { status: 410 }
  );
}
