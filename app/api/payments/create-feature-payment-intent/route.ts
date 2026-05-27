/**
 * POST /api/payments/create-feature-payment-intent
 * @deprecated Use /api/razorpay/create-order with { type: "feature", featureId } instead.
 *
 * Kept for backward compatibility. Delegates to the new Razorpay create-order endpoint.
 * Body: { featureId }
 * Response: { razorpayOrderId, dbOrderId, amount, featureName, featureSlug, key }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createFeatureRazorpayOrder } from "@/services/feature.service";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { featureId: rawId } = await req.json() as { featureId: string };
    if (!rawId) return NextResponse.json({ error: "featureId is required" }, { status: 400 });

    const result = await createFeatureRazorpayOrder(session.userId, rawId);
    return NextResponse.json({ ...result, key: process.env.RAZORPAY_KEY_ID });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
