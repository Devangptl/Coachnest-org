/**
 * POST /api/subscriptions/cancel
 * Sets cancel_at_period_end=true on Stripe. Access is preserved until the period ends.
 * Returns the updated subscription record so the UI can display the accurate end date.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { cancelSubscription } from "@/services/subscription.service";

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role === "STUDENT") {
      return NextResponse.json(
        { error: "Students do not have subscriptions to cancel.", code: "SUBSCRIPTION_MODEL_REMOVED" },
        { status: 410 }
      );
    }

    const result = await cancelSubscription(session.userId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
