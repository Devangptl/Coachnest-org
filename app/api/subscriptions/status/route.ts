/**
 * GET /api/subscriptions/status
 * Returns the current user's subscription record.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserSubscription } from "@/services/subscription.service";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await getUserSubscription(session.userId);
    return NextResponse.json({ subscription });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
