/**
 * POST /api/subscriptions/sync
 *
 * Subscription plans have been removed. Returns 410 Gone.
 */
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Subscription sync is no longer available. The platform uses a direct-purchase model.",
      code: "SUBSCRIPTION_MODEL_REMOVED",
    },
    { status: 410 }
  );
}
