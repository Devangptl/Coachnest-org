/**
 * POST /api/subscriptions/portal
 * Creates a Stripe Customer Portal session for managing billing.
 * Returns: { url: string }
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createBillingPortalSession } from "@/services/subscription.service";

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await createBillingPortalSession(session.userId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
