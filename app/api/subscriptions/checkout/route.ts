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
function studentNotAllowed() {
  return NextResponse.json(
    {
      error:
        "Students use the direct-purchase model. " +
        "Subscription plans are not available for student accounts.",
      code: "SUBSCRIPTION_MODEL_REMOVED",
    },
    { status: 410 }
  );
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role === "STUDENT") return studentNotAllowed();

    const body = await req.json();
    const { plan, billing } = body as { plan: string; billing: "monthly" | "yearly" };

    if (!plan || !billing) {
      return NextResponse.json(
        { error: "plan and billing are required" },
        { status: 400 }
      );
    }

    const validPlans   = ["BASIC", "PRO", "ENTERPRISE"];
    const validBilling = ["monthly", "yearly"];

    if (!validPlans.includes(plan.toUpperCase())) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    if (!validBilling.includes(billing)) {
      return NextResponse.json({ error: "Invalid billing period" }, { status: 400 });
    }

    const result = await createSubscriptionCheckout(
      session.userId,
      plan.toUpperCase(),
      billing
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
