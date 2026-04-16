/**
 * POST /api/billing/subscribe
 *
 * Subscription plans have been removed. Returns 410 Gone.
 */
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Subscription plans are no longer available. Please purchase courses or enrollments directly.",
      code: "SUBSCRIPTION_MODEL_REMOVED",
    },
    { status: 410 }
  );
}
