/**
 * Payment Service — orchestrates Stripe Checkout Session creation,
 * webhook-driven enrollment, and notification after a successful purchase.
 *
 * Revenue split for course purchases:
 *   Instructor: course.instructorRevenuePercent %  (default 70, range 70–80)
 *   Platform:   (100 - instructorRevenuePercent) % (default 30)
 *
 * Feature add-on purchases route to feature.service.ts (100% platform).
 */
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { sendPurchaseEmail } from "@/lib/email";
import { handleFeaturePaymentSuccess } from "@/services/feature.service";

// ─── Create Stripe Checkout Session ──────────────────────────────────────────

export async function createCheckoutSession(
  userId: string,
  courseId: string,
  couponCode?: string
) {
  // Verify user exists (session may reference a deleted user after DB reset)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) throw new Error("User not found. Please log out and log back in.");

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      price: true,
      discountPrice: true,
      isFree: true,
      thumbnail: true,
      instructorRevenuePercent: true,
    },
  });
  if (!course) throw new Error("Course not found");
  if (course.isFree) throw new Error("Course is free, no payment required");
  if (!course.price) throw new Error("Course has no price set");

  // Already enrolled?
  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (existing) throw new Error("Already enrolled in this course");

  // Use discountPrice if set and lower than original price
  const basePrice = course.discountPrice && Number(course.discountPrice) < Number(course.price)
    ? Number(course.discountPrice)
    : Number(course.price);
  let finalAmount = basePrice;
  let discountAmt = 0;
  let couponId: string | undefined;

  // Apply coupon if provided
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: couponCode.toUpperCase() },
    });
    if (!coupon) throw new Error("Invalid coupon code");
    if (coupon.expiresAt && coupon.expiresAt < new Date())
      throw new Error("Coupon has expired");
    if (coupon.maxUses && coupon.uses >= coupon.maxUses)
      throw new Error("Coupon usage limit reached");
    if (coupon.courseId && coupon.courseId !== courseId)
      throw new Error("Coupon not valid for this course");

    discountAmt =
      coupon.discountType === "PERCENTAGE"
        ? (finalAmount * Number(coupon.discount)) / 100
        : Math.min(Number(coupon.discount), finalAmount);
    finalAmount = Math.max(0, finalAmount - discountAmt);
    couponId = coupon.id;
  }

  // Pre-calculate revenue split (stored at checkout; finalised on PAID)
  const instructorPct = course.instructorRevenuePercent ?? 70;
  const instructorRevenue = parseFloat(((finalAmount * instructorPct) / 100).toFixed(2));
  const platformRevenue = parseFloat((finalAmount - instructorRevenue).toFixed(2));

  // Create a pending order in DB
  const order = await prisma.order.create({
    data: {
      userId,
      courseId,
      amount: finalAmount,
      currency: "INR",
      status: "PENDING",
      couponId,
      discountAmount: discountAmt > 0 ? discountAmt : undefined,
      instructorRevenue,
      platformRevenue,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Create Stripe Checkout Session
  // Indian regulations (RBI) require customer name + address for INR payments
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: user.email,
    billing_address_collection: "required",
    payment_intent_data: {
      description: `Course purchase: ${course.title}`,
      // shipping requires line1 in Checkout Sessions; billing_address_collection
      // below collects the full address from the customer at checkout instead.
    },
    line_items: [
      {
        price_data: {
          currency: "inr",
          unit_amount: Math.round(finalAmount * 100), // amount in paise
          product_data: {
            name: course.title,
            ...(course.thumbnail ? { images: [course.thumbnail] } : {}),
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      orderId: order.id,
      courseId,
      userId,
    },
    success_url: `${appUrl}/courses/${courseId}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/courses/${courseId}?payment=cancelled`,
  });

  // Save Stripe session ID to the order
  await prisma.order.update({
    where: { id: order.id },
    data: { stripeSessionId: session.id },
  });

  return {
    orderId: order.id,
    sessionId: session.id,
    url: session.url,
  };
}

// ─── Handle PaymentIntent success (in-app course purchase) ───────────────────

export async function handlePaymentIntentSuccess(paymentIntentId: string) {
  const order = await prisma.order.findFirst({
    where:   { stripePaymentId: paymentIntentId },
    include: {
      user:   { select: { email: true, name: true } },
      course: { select: { id: true, title: true, instructorRevenuePercent: true } },
    },
  });
  if (!order) throw new Error("Order not found for payment intent");
  if (order.status === "PAID") return { success: true, courseId: order.courseId };

  if (order.featureId) {
    await handleFeaturePaymentSuccess(order.id, paymentIntentId);
    return { success: true, courseId: null };
  }

  const userId = order.userId;

  const instructorPct     = order.course?.instructorRevenuePercent ?? 70;
  const paidAmount        = Number(order.amount);
  const instructorRevenue = parseFloat(((paidAmount * instructorPct) / 100).toFixed(2));
  const platformRevenue   = parseFloat((paidAmount - instructorRevenue).toFixed(2));

  await prisma.order.update({
    where: { id: order.id },
    data:  { status: "PAID", instructorRevenue, platformRevenue },
  });

  await prisma.enrollment.upsert({
    where:  { userId_courseId: { userId, courseId: order.courseId! } },
    create: { userId, courseId: order.courseId! },
    update: {},
  });

  if (order.couponId) {
    await prisma.coupon.update({ where: { id: order.couponId }, data: { uses: { increment: 1 } } });
    await prisma.couponUse.upsert({
      where:  { userId_couponId: { userId, couponId: order.couponId } },
      create: { userId, couponId: order.couponId },
      update: {},
    });
  }

  await prisma.notification.create({
    data: {
      userId,
      title: `Enrolled in "${order.course!.title}"`,
      body:  "Your payment was successful. Start learning now!",
      type:  "PURCHASE",
      link:  `/courses/${order.course!.id}`,
    },
  });

  if (order.user && order.course) {
    sendPurchaseEmail(
      order.user.email, order.user.name,
      order.course.title, order.amount.toString(), order.course.id
    ).catch(console.error);
  }

  return { success: true, courseId: order.courseId };
}

// ─── Handle successful payment (called from webhook) ─────────────────────────

export async function handlePaymentSuccess(
  sessionId: string,
  paymentIntentId: string
) {
  const order = await prisma.order.findFirst({
    where: { stripeSessionId: sessionId },
    include: {
      user:   { select: { email: true, name: true } },
      course: { select: { id: true, title: true, instructorRevenuePercent: true } },
    },
  });
  if (!order) throw new Error("Order not found for session");
  if (order.status === "PAID") return { success: true, courseId: order.courseId };

  // Route feature-add-on orders to the dedicated handler
  if (order.featureId) {
    await handleFeaturePaymentSuccess(order.id, paymentIntentId);
    return { success: true, courseId: null };
  }

  const userId = order.userId;

  // ── Revenue split ────────────────────────────────────────────────────────
  // Re-derive from the course's current setting so we always store the most
  // accurate value (the provisional split set at checkout is overwritten here).
  const instructorPct = order.course?.instructorRevenuePercent ?? 70;
  const paidAmount    = Number(order.amount);
  const instructorRevenue = parseFloat(((paidAmount * instructorPct) / 100).toFixed(2));
  const platformRevenue   = parseFloat((paidAmount - instructorRevenue).toFixed(2));

  // Mark order as paid + record revenue split
  // Using sequential operations instead of $transaction to avoid
  // "Transaction not found" on serverless (Vercel). Each step is idempotent.
  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "PAID",
      stripePaymentId: paymentIntentId,
      instructorRevenue,
      platformRevenue,
    },
  });

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId, courseId: order.courseId! } },
    create: { userId, courseId: order.courseId! },
    update: {},
  });

  if (order.couponId) {
    await prisma.coupon.update({
      where: { id: order.couponId },
      data: { uses: { increment: 1 } },
    });
    await prisma.couponUse.upsert({
      where: { userId_couponId: { userId, couponId: order.couponId } },
      create: { userId, couponId: order.couponId },
      update: {},
    });
  }

  await prisma.notification.create({
    data: {
      userId,
      title: `Enrolled in "${order.course!.title}"`,
      body: "Your payment was successful. Start learning now!",
      type: "PURCHASE",
      link: `/courses/${order.course!.id}`,
    },
  });

  // Fire-and-forget email
  if (order.user && order.course) {
    sendPurchaseEmail(
      order.user.email,
      order.user.name,
      order.course.title,
      order.amount.toString(),
      order.course.id
    ).catch(console.error);
  }

  return { success: true, courseId: order.courseId };
}
