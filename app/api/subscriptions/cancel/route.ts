/**
 * POST /api/subscriptions/cancel
 * Cancels the current user's subscription at the end of the billing period.
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

    const result = await cancelSubscription(session.userId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
