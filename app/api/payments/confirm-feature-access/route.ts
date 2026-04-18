/**
 * POST /api/payments/confirm-feature-access
 * Called immediately after stripe.confirmCardPayment() succeeds in the browser.
 * Marks the order PAID and upserts the FeaturePurchase — no webhook wait needed.
 *
 * Body:     { paymentIntentId }
 * Response: { success: true, featureSlug }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { paymentIntentId } = await req.json() as { paymentIntentId: string };
    if (!paymentIntentId) return NextResponse.json({ error: "paymentIntentId is required" }, { status: 400 });

    // Verify with Stripe that payment actually succeeded
    const stripe = getStripe();
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (pi.status !== "succeeded" && pi.status !== "processing") {
      return NextResponse.json(
        { error: `Payment not confirmed (status: ${pi.status})` },
        { status: 400 }
      );
    }

    const orderId = pi.metadata?.orderId;
    if (!orderId) return NextResponse.json({ error: "Order not found in payment metadata" }, { status: 400 });

    const order = await prisma.order.findUnique({
      where:   { id: orderId },
      include: { feature: { select: { id: true, name: true, slug: true } } },
    });

    if (!order)           return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (!order.featureId) return NextResponse.json({ error: "Not a feature order" }, { status: 400 });
    if (order.userId !== session.userId)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Idempotent — if already processed by webhook, just return success
    if (order.status === "PAID") {
      return NextResponse.json({ success: true, featureSlug: order.feature?.slug });
    }

    // Mark order paid + grant feature access in a transaction
    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data:  { status: "PAID", stripePaymentId: paymentIntentId },
      }),
      prisma.featurePurchase.upsert({
        where:  { userId_featureId: { userId: order.userId, featureId: order.featureId } },
        create: { userId: order.userId, featureId: order.featureId, orderId },
        update: {},
      }),
    ]);

    // Notify user
    if (order.feature) {
      await createNotification({
        data: {
          userId: order.userId,
          title:  `${order.feature.name} unlocked!`,
          body:   `You now have lifetime access to the ${order.feature.name} feature. Enjoy!`,
          type:   "PURCHASE",
          link:   `/${order.feature.slug}`,
        },
      }).catch(() => {}); // non-critical
    }

    return NextResponse.json({ success: true, featureSlug: order.feature?.slug });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
