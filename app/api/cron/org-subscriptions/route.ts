/**
 * POST /api/cron/org-subscriptions — expiry sweep for org subscriptions.
 * Flips ACTIVE subscriptions past endDate (and their orgs) to EXPIRED and
 * emails the org. Guarded by the CRON_SECRET bearer token; schedule via
 * Vercel cron or a Supabase scheduled function.
 *
 * Access is also locked at read time (lib/org-auth.ts checks endDate), so a
 * delayed sweep never extends access — this keeps statuses and emails timely.
 */
import { NextRequest, NextResponse } from "next/server";
import { markExpiredSubscriptions } from "@/services/org-subscription.service";

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await markExpiredSubscriptions();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/cron/org-subscriptions]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
