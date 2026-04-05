/**
 * POST /api/subscriptions/resume
 * Reverses a cancel_at_period_end cancellation — the subscription stays active
 * and will renew normally at the next billing date.
 * Returns the updated subscription record.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { resumeSubscription } from "@/services/subscription.service";

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await resumeSubscription(session.userId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
