/**
 * POST /api/subscriptions/portal
 * Stub — subscription plans removed. Returns 410.
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
    if (session.role === "STUDENT") {
      return NextResponse.json(
        {
          error: "Students do not have a subscription billing portal. View your purchases at /api/student/purchases.",
          code:  "SUBSCRIPTION_MODEL_REMOVED",
          purchasesUrl: "/api/student/purchases",
        },
        { status: 410 }
      );
    }

    const result = await createBillingPortalSession(session.userId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
