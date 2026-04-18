/**
 * Feature Service — handles purchasing platform add-on features (e.g. Community).
 *
 * Revenue from feature purchases goes 100% to the platform.
 */
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { getStripe } from "@/lib/stripe";

// ─── Create Stripe Checkout Session for a feature purchase ───────────────────

export async function createFeatureCheckoutSession(
  userId: string,
  featureId: string
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) throw new Error("User not found. Please log out and log back in.");

  const feature = await prisma.platformFeature.findUnique({
    where: { id: featureId },
    select: { id: true, name: true, slug: true, price: true, isActive: true },
  });
  if (!feature) throw new Error("Feature not found.");
  if (!feature.isActive) throw new Error("This feature is not currently available.");

  // Already purchased?
  const existing = await prisma.featurePurchase.findUnique({
    where: { userId_featureId: { userId, featureId } },
  });
  if (existing) throw new Error("You already have access to this feature.");

  const amount = Number(feature.price);

  // Create a pending order — 100% platform revenue for add-ons
  const order = await prisma.order.create({
    data: {
      userId,
      featureId,
      amount,
      currency: "INR",
      status: "PENDING",
      instructorRevenue: 0,
      platformRevenue: amount,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    billing_address_collection: "required",
    line_items: [
      {
        price_data: {
          currency: "inr",
          unit_amount: Math.round(amount * 100),
          product_data: {
            name: `${feature.name} — Platform Add-on`,
            description: `One-time purchase for lifetime access to the ${feature.name} feature.`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      orderId: order.id,
      featureId,
      userId,
      type: "feature",
    },
    success_url: `${appUrl}/features/${feature.slug}?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/features/${feature.slug}?cancelled=true`,
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { stripeSessionId: session.id },
  });

  return { orderId: order.id, sessionId: session.id, url: session.url };
}

// ─── Handle successful feature payment (called from webhook) ─────────────────

export async function handleFeaturePaymentSuccess(
  orderId: string,
  paymentIntentId: string
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      feature: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!order) throw new Error(`Feature order not found: ${orderId}`);
  if (!order.featureId) throw new Error("Order is not a feature purchase.");
  if (order.status === "PAID") return { success: true }; // idempotent

  // Mark order as paid
  await prisma.order.update({
    where: { id: order.id },
    data: { status: "PAID", stripePaymentId: paymentIntentId },
  });

  // Grant feature access (upsert for idempotency)
  await prisma.featurePurchase.upsert({
    where: { userId_featureId: { userId: order.userId, featureId: order.featureId } },
    create: {
      userId: order.userId,
      featureId: order.featureId,
      orderId: order.id,
    },
    update: {}, // already granted — no-op
  });

  // Notify the user
  if (order.feature) {
    await createNotification({
      data: {
        userId: order.userId,
        title: `${order.feature.name} unlocked!`,
        body: `You now have lifetime access to the ${order.feature.name} feature. Enjoy!`,
        type: "PURCHASE",
        link: `/features/${order.feature.slug}`,
      },
    });
  }

  return { success: true };
}
