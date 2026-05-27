/**
 * Feature Service — handles purchasing platform add-on features (e.g. Community).
 *
 * Revenue from feature purchases goes 100% to the platform.
 */
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { getRazorpay } from "@/lib/razorpay";

// ─── Create Razorpay order for a feature purchase ─────────────────────────────

export async function createFeatureRazorpayOrder(
  userId:    string,
  featureId: string
) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) throw new Error("User not found. Please log out and log back in.");

  const feature = await prisma.platformFeature.findFirst({
    where:  { OR: [{ id: featureId }, { slug: featureId }] },
    select: { id: true, name: true, slug: true, price: true, isActive: true },
  });
  if (!feature)           throw new Error("Feature not found.");
  if (!feature.isActive)  throw new Error("This feature is not currently available.");

  // Already purchased?
  const existing = await prisma.featurePurchase.findUnique({
    where: { userId_featureId: { userId, featureId: feature.id } },
  });
  if (existing) throw new Error("You already have access to this feature.");

  const amount = Number(feature.price);

  // Enforce Razorpay minimum amount (₹1 = 100 paise)
  if (Math.round(amount * 100) < 100) {
    throw new Error("Minimum order amount is ₹1");
  }

  // Create pending order — 100% platform revenue for add-ons
  const order = await prisma.order.create({
    data: {
      userId,
      featureId:         feature.id,
      amount,
      currency:          "INR",
      status:            "PENDING",
      instructorRevenue: 0,
      platformRevenue:   amount,
    },
  });

  // Create Razorpay order
  const razorpay = getRazorpay();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rzpOrder = await (razorpay.orders.create as any)({
    amount:   Math.round(amount * 100), // paise
    currency: "INR",
    receipt:  `feature_${order.id}`,
    notes: {
      orderId:   order.id,
      featureId: feature.id,
      userId,
      type:      "feature",
    },
  });

  await prisma.order.update({
    where: { id: order.id },
    data:  { razorpayOrderId: rzpOrder.id },
  });

  return {
    razorpayOrderId: rzpOrder.id as string,
    dbOrderId:       order.id,
    amount,
    currency:        "INR",
    featureSlug:     feature.slug,
    featureName:     feature.name,
  };
}

// ─── Finalize feature payment after signature verification ────────────────────

export async function handleFeaturePaymentSuccess(
  orderId:           string,
  razorpayPaymentId: string
) {
  const order = await prisma.order.findUnique({
    where:   { id: orderId },
    include: { feature: { select: { id: true, name: true, slug: true } } },
  });
  if (!order)            throw new Error(`Feature order not found: ${orderId}`);
  if (!order.featureId)  throw new Error("Order is not a feature purchase.");
  if (order.status === "PAID") return { success: true }; // idempotent

  // Mark order as paid
  await prisma.order.update({
    where: { id: order.id },
    data:  { status: "PAID", razorpayPaymentId },
  });

  // Grant feature access (upsert for idempotency)
  await prisma.featurePurchase.upsert({
    where:  { userId_featureId: { userId: order.userId, featureId: order.featureId } },
    create: { userId: order.userId, featureId: order.featureId, orderId: order.id },
    update: {},
  });

  // Notify the user
  if (order.feature) {
    await createNotification({
      data: {
        userId: order.userId,
        title:  `${order.feature.name} unlocked!`,
        body:   `You now have lifetime access to the ${order.feature.name} feature. Enjoy!`,
        type:   "PURCHASE",
        link:   `/features/${order.feature.slug}`,
      },
    });
  }

  return { success: true };
}
