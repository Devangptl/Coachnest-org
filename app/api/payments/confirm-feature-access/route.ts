/**
 * POST /api/payments/confirm-feature-access
 * Confirms a feature purchase after a successful Razorpay payment.
 * The signature must have already been verified by /api/razorpay/verify-payment.
 *
 * Body: { dbOrderId: string, razorpayPaymentId: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { handleFeaturePaymentSuccess } from "@/services/feature.service";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { dbOrderId, razorpayPaymentId } = await req.json() as {
      dbOrderId:         string;
      razorpayPaymentId: string;
    };

    if (!dbOrderId || !razorpayPaymentId) {
      return NextResponse.json(
        { error: "dbOrderId and razorpayPaymentId are required" },
        { status: 400 }
      );
    }

    await handleFeaturePaymentSuccess(dbOrderId, razorpayPaymentId);

    const order = await prisma.order.findUnique({
      where:  { id: dbOrderId },
      select: { feature: { select: { slug: true } } },
    });

    return NextResponse.json({ success: true, featureSlug: order?.feature?.slug ?? null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
