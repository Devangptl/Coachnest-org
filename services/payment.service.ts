/**
 * Payment Service — orchestrates Razorpay order creation, verification,
 * enrollment, and notification after a successful purchase.
 */
import { prisma } from "@/lib/prisma";
import { getRazorpay, verifyPaymentSignature } from "@/lib/razorpay";
import { sendPurchaseEmail } from "@/lib/email";

// ─── Create Razorpay order ────────────────────────────────────────────────────

export async function createCourseOrder(
  userId:   string,
  courseId: string,
  couponCode?: string
) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, price: true, isFree: true },
  });
  if (!course) throw new Error("Course not found");
  if (course.isFree) throw new Error("Course is free, no payment required");
  if (!course.price)  throw new Error("Course has no price set");

  // Already enrolled?
  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (existing) throw new Error("Already enrolled in this course");

  let finalAmount  = Number(course.price);
  let discountAmt  = 0;
  let couponId: string | undefined;

  // Apply coupon if provided
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
    if (!coupon) throw new Error("Invalid coupon code");
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new Error("Coupon has expired");
    if (coupon.maxUses && coupon.uses >= coupon.maxUses) throw new Error("Coupon usage limit reached");
    if (coupon.courseId && coupon.courseId !== courseId) throw new Error("Coupon not valid for this course");

    discountAmt =
      coupon.discountType === "PERCENTAGE"
        ? (finalAmount * Number(coupon.discount)) / 100
        : Math.min(Number(coupon.discount), finalAmount);
    finalAmount = Math.max(0, finalAmount - discountAmt);
    couponId = coupon.id;
  }

  // Create a pending order in DB first
  const order = await prisma.order.create({
    data: {
      userId,
      courseId,
      amount:        finalAmount,
      currency:      "INR",
      status:        "PENDING",
      couponId,
      discountAmount: discountAmt > 0 ? discountAmt : undefined,
    },
  });

  // Create Razorpay order (amount in paise)
  const rzpOrder = await getRazorpay().orders.create({
    amount:   Math.round(finalAmount * 100),
    currency: "INR",
    receipt:  order.id,
    notes:    { courseId, userId },
  });

  // Save Razorpay order ID
  await prisma.order.update({
    where: { id: order.id },
    data:  { razorpayOrderId: rzpOrder.id },
  });

  return {
    orderId:       order.id,
    razorpayOrderId: rzpOrder.id,
    amount:        finalAmount,
    currency:      "INR",
    courseName:    course.title,
  };
}

// ─── Verify payment & enroll student ─────────────────────────────────────────

export async function verifyAndEnroll(
  userId:    string,
  orderId:   string,
  paymentId: string,
  signature: string
) {
  const order = await prisma.order.findFirst({
    where: { razorpayOrderId: orderId, userId },
    include: {
      user:   { select: { email: true, name: true } },
      course: { select: { id: true, title: true } },
    },
  });
  if (!order)  throw new Error("Order not found");
  if (order.status === "PAID") throw new Error("Order already processed");

  // Verify signature
  const valid = verifyPaymentSignature({ orderId, paymentId, signature });
  if (!valid) throw new Error("Payment signature verification failed");

  // Atomic: mark paid + enroll + increment coupon uses
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data:  { status: "PAID", razorpayPaymentId: paymentId, razorpaySignature: signature },
    });

    await tx.enrollment.upsert({
      where:  { userId_courseId: { userId, courseId: order.courseId! } },
      create: { userId, courseId: order.courseId! },
      update: {},
    });

    if (order.couponId) {
      await tx.coupon.update({
        where: { id: order.couponId },
        data:  { uses: { increment: 1 } },
      });
      await tx.couponUse.upsert({
        where:  { userId_couponId: { userId, couponId: order.couponId } },
        create: { userId, couponId: order.couponId },
        update: {},
      });
    }

    // Notify the student
    await tx.notification.create({
      data: {
        userId,
        title: `Enrolled in "${order.course!.title}"`,
        body:  "Your payment was successful. Start learning now!",
        type:  "PURCHASE",
        link:  `/courses/${order.course!.id}`,
      },
    });
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
