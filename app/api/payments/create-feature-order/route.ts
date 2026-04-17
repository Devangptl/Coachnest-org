/**
 * POST /api/payments/create-feature-order
 * Creates a Stripe Checkout Session for a platform feature add-on purchase.
 * Body: { featureId }  (DB id OR slug)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createFeatureCheckoutSession } from "@/services/payment.service";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { featureId } = await req.json();
    if (!featureId)
      return NextResponse.json({ error: "featureId is required" }, { status: 400 });

    const result = await createFeatureCheckoutSession(session.userId, featureId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
