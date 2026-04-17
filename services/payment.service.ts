/**
 * Payment Service — orchestrates Stripe Checkout Session creation,
 * webhook-driven enrollment, and notification after a successful purchase.
 *
 * Revenue split rules (stored per-transaction for full auditability):
 *   ORGANIC  → base course setting (70–80 %, default 70 %)
 *   COUPON   → 85 % instructor / 15 % platform  (instructor's own coupon)
 *   REFERRAL → 90 % instructor / 10 % platform  (instructor's referral link)
 *   ADS      → base course setting (platform-paid acquisition)
 *
 * After a course sale is confirmed (PAID), the instructor's wallet is credited
 * via creditInstructorWallet() and a WalletTransaction record is created.
 */
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { sendPurchaseEmail } from "@/lib/email";
import { handleFeaturePaymentSuccess } from "@/services/feature.service";

// ─── Revenue split constants ──────────────────────────────────────────────────

const REFERRAL_INSTRUCTOR_PCT = 90;
const COUPON_INSTRUCTOR_PCT   = 85;

// ─── Helper: determine sale source + instructor % ─────────────────────────────

async function resolveSplit(
  courseId:       string,
  basePercent:    number,
  couponId?:      string | null,
  referralCode?:  string | null
): Promise<{
  saleSource:        "ORGANIC" | "REFERRAL" | "COUPON" | "ADS";
  instructorPercent: number;
  referralLinkId:    string | null;
}> {
  // 1. Referral link takes highest priority
  if (referralCode) {
    const link = await prisma.referralLink.findUnique({
      where:  { code: referralCode },
      select: { id: true, instructorId: true, courseId: true, isActive: true },
    });
    if (link && link.isActive) {
      // Validate: link must belong to the course's instructor
      const course = await prisma.course.findUnique({
        where:  { id: courseId },
        select: { createdById: true },
      });
      if (course && link.instructorId === course.createdById) {
        // Optional: link may be scoped to a specific course
        if (!link.courseId || link.courseId === courseId) {
          return {
            saleSource:        "REFERRAL",
            instructorPercent: REFERRAL_INSTRUCTOR_PCT,
            referralLinkId:    link.id,
          };
        }
      }
    }
  }

  // 2. Coupon — elevated split only when the coupon was created by the course instructor
  if (couponId) {
    const [coupon, course] = await Promise.all([
      prisma.coupon.findUnique({
        where:  { id: couponId },
        select: { createdById: true, courseId: true },
      }),
      prisma.course.findUnique({
        where:  { id: courseId },
        select: { createdById: true },
      }),
    ]);
    const isInstructorCoupon =
      coupon &&
      course &&
      (coupon.createdById === course.createdById ||
        coupon.courseId   === courseId);

    if (isInstructorCoupon) {
      return {
        saleSource:        "COUPON",
        instructorPercent: COUPON_INSTRUCTOR_PCT,
        referralLinkId:    null,
      };
    }
    // Platform coupon — organic split applies
    return { saleSource: "COUPON", instructorPercent: basePercent, referralLinkId: null };
  }

  // 3. Organic
  return { saleSource: "ORGANIC", instructorPercent: basePercent, referralLinkId: null };
}

// ─── Helper: write purchase ledger entries ────────────────────────────────────

async function createPurchaseLedgerEntries(
  orderId:          string,
  userId:           string,
  courseId:         string,
  amount:           number,
  instructorRevenue: number,
  platformRevenue:  number,
  courseTitle:      string
) {
  await prisma.ledgerEntry.createMany({
    data: [
      {
        orderId,
        userId,
        courseId,
        type:        "PURCHASE",
        amount,
        description: `Course purchase — "${courseTitle}"`,
        meta:        { courseTitle },
      },
      {
        orderId,
        userId,
        courseId,
        type:        "INSTRUCTOR_EARNING",
        amount:      instructorRevenue,
        description: `Instructor earning — "${courseTitle}"`,
        meta:        { courseTitle },
      },
      {
        orderId,
        userId,
        courseId,
        type:        "PLATFORM_FEE",
        amount:      platformRevenue,
        description: `Platform fee — "${courseTitle}"`,
        meta:        { courseTitle },
      },
    ],
  });
}

// ─── Helper: credit instructor wallet after a confirmed sale ──────────────────

async function creditInstructorWallet(
  order: {
    id:               string;
    courseId:         string | null;
    instructorRevenue: number;
    saleSource:       string;
    instructorPercent: number | null;
  }
) {
  if (!order.courseId || order.instructorRevenue <= 0) return;

  const course = await prisma.course.findUnique({
    where:  { id: order.courseId },
    select: { createdById: true, title: true },
  });
  if (!course) return;

  const wallet = await prisma.instructorWallet.upsert({
    where:  { userId: course.createdById },
    create: {
      userId:         course.createdById,
      balance:        order.instructorRevenue,
      totalEarned:    order.instructorRevenue,
      totalWithdrawn: 0,
    },
    update: {
      balance:     { increment: order.instructorRevenue },
      totalEarned: { increment: order.instructorRevenue },
    },
  });

  await prisma.walletTransaction.create({
    data: {
      walletId:    wallet.id,
      orderId:     order.id,
      amount:      order.instructorRevenue,
      type:        "CREDIT",
      description: `Sale: "${course.title}"`,
      meta: {
        courseTitle:       course.title,
        saleSource:        order.saleSource,
        instructorPercent: order.instructorPercent,
      },
    },
  });
}

// ─── Create Stripe Checkout Session ──────────────────────────────────────────

export async function createCheckoutSession(
  userId:        string,
  courseId:      string,
  couponCode?:   string,
  referralCode?: string
) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) throw new Error("User not found. Please log out and log back in.");

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true, title: true, price: true,
      discountPrice: true, isFree: true, thumbnail: true,
      instructorRevenuePercent: true,
    },
  });
  if (!course)        throw new Error("Course not found");
  if (course.isFree)  throw new Error("Course is free, no payment required");
  if (!course.price)  throw new Error("Course has no price set");

  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (existing) throw new Error("Already enrolled in this course");

  const basePrice = course.discountPrice && Number(course.discountPrice) < Number(course.price)
    ? Number(course.discountPrice)
    : Number(course.price);
  let finalAmount = basePrice;
  let discountAmt = 0;
  let couponId: string | undefined;

  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
    if (!coupon) throw new Error("Invalid coupon code");
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new Error("Coupon has expired");
    if (coupon.maxUses && coupon.uses >= coupon.maxUses)   throw new Error("Coupon usage limit reached");
    if (coupon.courseId && coupon.courseId !== courseId)   throw new Error("Coupon not valid for this course");

    discountAmt = coupon.discountType === "PERCENTAGE"
      ? (finalAmount * Number(coupon.discount)) / 100
      : Math.min(Number(coupon.discount), finalAmount);
    finalAmount = Math.max(0, finalAmount - discountAmt);
    couponId = coupon.id;
  }

  // Resolve dynamic split
  const basePercent = course.instructorRevenuePercent ?? 70;
  const { saleSource, instructorPercent, referralLinkId } =
    await resolveSplit(courseId, basePercent, couponId ?? null, referralCode ?? null);

  const instructorRevenue = parseFloat(((finalAmount * instructorPercent) / 100).toFixed(2));
  const platformRevenue   = parseFloat((finalAmount - instructorRevenue).toFixed(2));

  const order = await prisma.order.create({
    data: {
      userId,
      courseId,
      amount:            finalAmount,
      currency:          "INR",
      status:            "PENDING",
      couponId,
      discountAmount:    discountAmt > 0 ? discountAmt : undefined,
      instructorRevenue,
      platformRevenue,
      saleSource,
      instructorPercent,
      referralLinkId,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode:                 "payment",
    payment_method_types: ["card", "upi"],
    customer_email:       user.email,
    payment_intent_data:  { description: `Course purchase: ${course.title}` },
    line_items: [{
      price_data: {
        currency:     "inr",
        unit_amount:  Math.round(finalAmount * 100),
        product_data: {
          name: course.title,
          ...(course.thumbnail ? { images: [course.thumbnail] } : {}),
        },
      },
      quantity: 1,
    }],
    metadata:    { orderId: order.id, courseId, userId, type: "course" },
    success_url: `${appUrl}/checkout/success?type=course&courseId=${courseId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${appUrl}/checkout/cancel?type=course&courseId=${courseId}`,
  });

  await prisma.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });

  // Increment referral link click count (conversion counted on payment success)
  if (referralLinkId) {
    await prisma.referralLink.update({
      where: { id: referralLinkId },
      data:  { totalClicks: { increment: 1 } },
    }).catch(() => null);
  }

  return { orderId: order.id, sessionId: session.id, url: session.url };
}

// ─── Handle PaymentIntent success (in-app course purchase) ───────────────────

export async function handlePaymentIntentSuccess(paymentIntentId: string) {
  const order = await prisma.order.findFirst({
    where: { stripePaymentId: paymentIntentId },
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

  const userId    = order.userId;
  const paidAmount = Number(order.amount);

  // Use stored split (set at order creation); fall back to course setting
  const instructorPct     = Number(order.instructorPercent ?? order.course?.instructorRevenuePercent ?? 70);
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

  // Count referral conversion
  if (order.referralLinkId) {
    await prisma.referralLink.update({
      where: { id: order.referralLinkId },
      data:  { conversions: { increment: 1 } },
    }).catch(() => null);
  }

  // Credit instructor wallet
  await creditInstructorWallet({
    id:                order.id,
    courseId:          order.courseId,
    instructorRevenue,
    saleSource:        order.saleSource,
    instructorPercent: instructorPct,
  });

  // Write purchase ledger entries
  if (order.courseId && order.course) {
    await createPurchaseLedgerEntries(
      order.id, userId, order.courseId,
      paidAmount, instructorRevenue, platformRevenue,
      order.course.title
    ).catch(console.error);
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

// ─── Create Stripe Checkout Session for feature add-ons ──────────────────────

export async function createFeatureCheckoutSession(userId: string, featureId: string) {
  const [user, feature] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: { id: true, email: true, name: true },
    }),
    prisma.platformFeature.findFirst({
      where:  { OR: [{ id: featureId }, { slug: featureId }] },
      select: { id: true, name: true, slug: true, price: true, isActive: true },
    }),
  ]);

  if (!user)    throw new Error("User not found");
  if (!feature) throw new Error("Feature not found");
  if (!feature.isActive) throw new Error("This feature is not currently available");

  const existing = await prisma.featurePurchase.findUnique({
    where: { userId_featureId: { userId, featureId: feature.id } },
  });
  if (existing) throw new Error("You already have access to this feature");

  const amount = Number(feature.price);

  const order = await prisma.order.create({
    data: {
      userId,
      featureId:        feature.id,
      amount,
      currency:         "INR",
      status:           "PENDING",
      instructorRevenue: 0,
      platformRevenue:   amount,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const stripe  = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode:                 "payment",
    payment_method_types: ["card", "upi"],
    customer_email:       user.email,
    payment_intent_data:  { description: `Platform add-on: ${feature.name}` },
    line_items: [{
      price_data: {
        currency:     "inr",
        unit_amount:  Math.round(amount * 100),
        product_data: { name: feature.name },
      },
      quantity: 1,
    }],
    metadata:    { orderId: order.id, featureId: feature.id, userId, type: "feature" },
    success_url: `${appUrl}/checkout/success?type=feature&slug=${feature.slug}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${appUrl}/checkout/cancel?type=feature&slug=${feature.slug}`,
  });

  await prisma.order.update({
    where: { id: order.id },
    data:  { stripeSessionId: session.id },
  });

  return { orderId: order.id, sessionId: session.id, url: session.url };
}

// ─── Handle successful payment (called from webhook / verify endpoint) ────────

export async function handlePaymentSuccess(sessionId: string, paymentIntentId: string) {
  const order = await prisma.order.findFirst({
    where: { stripeSessionId: sessionId },
    include: {
      user:   { select: { email: true, name: true } },
      course: { select: { id: true, title: true, instructorRevenuePercent: true } },
    },
  });
  if (!order) throw new Error("Order not found for session");
  if (order.status === "PAID") return { success: true, courseId: order.courseId };

  if (order.featureId) {
    await handleFeaturePaymentSuccess(order.id, paymentIntentId);
    return { success: true, courseId: null };
  }

  const userId     = order.userId;
  const paidAmount = Number(order.amount);

  // Use stored split (set at order creation); fall back to course setting
  const instructorPct     = Number(order.instructorPercent ?? order.course?.instructorRevenuePercent ?? 70);
  const instructorRevenue = parseFloat(((paidAmount * instructorPct) / 100).toFixed(2));
  const platformRevenue   = parseFloat((paidAmount - instructorRevenue).toFixed(2));

  await prisma.order.update({
    where: { id: order.id },
    data: { status: "PAID", stripePaymentId: paymentIntentId, instructorRevenue, platformRevenue },
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

  // Count referral conversion
  if (order.referralLinkId) {
    await prisma.referralLink.update({
      where: { id: order.referralLinkId },
      data:  { conversions: { increment: 1 } },
    }).catch(() => null);
  }

  // Credit instructor wallet
  await creditInstructorWallet({
    id:                order.id,
    courseId:          order.courseId,
    instructorRevenue,
    saleSource:        order.saleSource,
    instructorPercent: instructorPct,
  });

  // Write purchase ledger entries
  if (order.courseId && order.course) {
    await createPurchaseLedgerEntries(
      order.id, userId, order.courseId,
      paidAmount, instructorRevenue, platformRevenue,
      order.course.title
    ).catch(console.error);
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
