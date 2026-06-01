/**
 * Payment Service — orchestrates Razorpay order creation, course enrollment,
 * and post-payment processing.
 *
 * Revenue split rules (stored per-transaction for full auditability):
 *   ORGANIC  → base course setting (70–80 %, default 70 %)
 *   COUPON   → 85 % instructor / 15 % platform  (instructor's own coupon)
 *   REFERRAL → 90 % instructor / 10 % platform  (instructor's referral link)
 *   ADS      → base course setting (platform-paid acquisition)
 *
 * After a course sale is confirmed, the instructor's wallet is credited
 * via creditInstructorWallet() and a WalletTransaction record is created.
 */
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { getRazorpay } from "@/lib/razorpay";
import { sendPurchaseEmail } from "@/lib/email";
import { handleFeaturePaymentSuccess } from "@/services/feature.service";
import { calcProcessingFee } from "@/lib/fees";
import {
  calculatePlatformDiscount,
  getActivePlatformOffer,
} from "@/services/platform-offer.service";
import { resolveRevenueShares } from "@/services/collaboration.service";

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
      const course = await prisma.course.findUnique({
        where:  { id: courseId },
        select: { createdById: true },
      });
      if (course && link.instructorId === course.createdById) {
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

  // Split the instructor's revenue across the owner and any active
  // collaborators based on their configured revenueShare percentages.
  const splits = await resolveRevenueShares(order.courseId, order.instructorRevenue);

  for (const split of splits) {
    if (split.amount <= 0) continue;

    const wallet = await prisma.instructorWallet.upsert({
      where:  { userId: split.userId },
      create: {
        userId:         split.userId,
        balance:        split.amount,
        totalEarned:    split.amount,
        totalWithdrawn: 0,
      },
      update: {
        balance:     { increment: split.amount },
        totalEarned: { increment: split.amount },
      },
    });

    const isOwner = split.userId === course.createdById;
    await prisma.walletTransaction.create({
      data: {
        walletId:    wallet.id,
        orderId:     order.id,
        amount:      split.amount,
        type:        "CREDIT",
        description: isOwner
          ? `Sale: "${course.title}"`
          : `Collaboration earning: "${course.title}"`,
        meta: {
          courseTitle:       course.title,
          saleSource:        order.saleSource,
          instructorPercent: order.instructorPercent,
          collaboratorShare: split.share,
          role:              isOwner ? "OWNER" : "COLLABORATOR",
        },
      },
    });
  }
}

// ─── Create Razorpay Order for course purchase ────────────────────────────────

export async function createCourseRazorpayOrder(
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
      discountPrice: true, isFree: true,
      instructorRevenuePercent: true, createdById: true,
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

  // Auto-apply the active platform-wide offer on top of any coupon. The
  // value is computed server-side from the DB so the client cannot tamper
  // with it.
  const offer = await getActivePlatformOffer("COURSES");
  let platformOfferId: string | undefined;
  let platformOfferDiscount = 0;
  if (offer && finalAmount > 0) {
    platformOfferDiscount = calculatePlatformDiscount(offer, finalAmount);
    if (platformOfferDiscount > 0) {
      finalAmount     = Math.max(0, finalAmount - platformOfferDiscount);
      platformOfferId = offer.id;
    }
  }

  // Processing fee (2%) added on top of the goods total → final payable amount
  const processingFee = calcProcessingFee(finalAmount);
  const payable       = parseFloat((finalAmount + processingFee).toFixed(2));

  // Resolve dynamic split
  const basePercent = course.instructorRevenuePercent ?? 70;
  const { saleSource, instructorPercent, referralLinkId } =
    await resolveSplit(courseId, basePercent, couponId ?? null, referralCode ?? null);

  // Instructor earns on the goods total; the processing fee goes to the platform
  const instructorRevenue = parseFloat(((finalAmount * instructorPercent) / 100).toFixed(2));
  const platformRevenue   = parseFloat((payable - instructorRevenue).toFixed(2));

  // Enforce Razorpay minimum amount (₹1 = 100 paise)
  if (Math.round(payable * 100) < 100) {
    throw new Error("Minimum order amount is ₹1");
  }

  // Create pending DB order
  const order = await prisma.order.create({
    data: {
      userId,
      courseId,
      amount:                payable,
      currency:              "INR",
      status:                "PENDING",
      couponId,
      discountAmount:        discountAmt > 0 ? discountAmt : undefined,
      platformOfferId,
      platformOfferDiscount: platformOfferDiscount > 0 ? platformOfferDiscount : undefined,
      processingFee,
      instructorRevenue,
      platformRevenue,
      saleSource,
      instructorPercent,
      referralLinkId,
    },
  });

  // Create Razorpay order
  const razorpay = getRazorpay();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rzpOrder = await (razorpay.orders.create as any)({
    amount:   Math.round(payable * 100), // paise
    currency: "INR",
    receipt:  `course_${order.id}`,
    notes: {
      orderId:  order.id,
      courseId,
      userId,
      type:     "course",
    },
  });

  await prisma.order.update({
    where: { id: order.id },
    data:  { razorpayOrderId: rzpOrder.id },
  });

  // Increment referral link click count
  if (referralLinkId) {
    await prisma.referralLink.update({
      where: { id: referralLinkId },
      data:  { totalClicks: { increment: 1 } },
    }).catch(() => null);
  }

  return {
    razorpayOrderId: rzpOrder.id as string,
    dbOrderId:       order.id,
    amount:          payable,
    subtotal:        finalAmount,
    processingFee,
    currency:        "INR",
    platformOfferDiscount,
    platformOfferTitle: offer?.title ?? null,
  };
}

// ─── Finalize course payment after Razorpay signature verification ────────────

export async function finalizeCoursePayment(
  dbOrderId:         string,
  razorpayPaymentId: string
) {
  const order = await prisma.order.findUnique({
    where: { id: dbOrderId },
    include: {
      user:   { select: { email: true, name: true } },
      course: { select: { id: true, title: true, instructorRevenuePercent: true } },
    },
  });
  if (!order) throw new Error("Order not found");
  // PAID = already finalised; REFUNDED = do not re-process or re-enroll
  if (order.status === "PAID" || order.status === "REFUNDED") {
    return { success: true, courseId: order.courseId };
  }

  // Feature purchase — delegate to feature service
  if (order.featureId) {
    await handleFeaturePaymentSuccess(order.id, razorpayPaymentId);
    return { success: true, courseId: null };
  }

  const userId     = order.userId;
  const paidAmount = Number(order.amount);

  // Use the revenue figures stored at order-creation time (calculated on goods-only total,
  // excluding the 2% processing fee). Fall back to re-deriving for legacy orders.
  const instructorPct = Number(order.instructorPercent ?? order.course?.instructorRevenuePercent ?? 70);
  const instructorRevenue = order.instructorRevenue != null
    ? Number(order.instructorRevenue)
    : parseFloat((((paidAmount / 1.02) * instructorPct) / 100).toFixed(2));
  const platformRevenue = parseFloat((paidAmount - instructorRevenue).toFixed(2));

  await prisma.order.update({
    where: { id: order.id },
    data:  { status: "PAID", razorpayPaymentId, instructorRevenue, platformRevenue },
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

  if (order.referralLinkId) {
    await prisma.referralLink.update({
      where: { id: order.referralLinkId },
      data:  { conversions: { increment: 1 } },
    }).catch(() => null);
  }

  await creditInstructorWallet({
    id:                order.id,
    courseId:          order.courseId,
    instructorRevenue,
    saleSource:        order.saleSource,
    instructorPercent: instructorPct,
  });

  if (order.courseId && order.course) {
    await createPurchaseLedgerEntries(
      order.id, userId, order.courseId,
      paidAmount, instructorRevenue, platformRevenue,
      order.course.title
    ).catch(console.error);
  }

  await createNotification({
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
