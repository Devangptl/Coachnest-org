/**
 * POST /api/payments/create-payment-intent
 * Creates a Stripe PaymentIntent for an in-app course purchase (no redirect).
 * Body: { courseId, couponCode? }
 * Response: { clientSecret, orderId, amount, courseName }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { courseId, couponCode, referralCode } = await req.json() as {
      courseId:      string;
      couponCode?:   string;
      referralCode?: string;
    };
    if (!courseId) return NextResponse.json({ error: "courseId is required" }, { status: 400 });

    const [user, course] = await Promise.all([
      prisma.user.findUnique({
        where:  { id: session.userId },
        select: { id: true, email: true, name: true, stripeCustomerId: true },
      }),
      prisma.course.findUnique({
        where:  { id: courseId },
        select: { id: true, title: true, price: true, discountPrice: true, isFree: true, instructorRevenuePercent: true, createdById: true },
      }),
    ]);

    if (!user)   return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
    if (course.isFree) return NextResponse.json({ error: "Course is free" }, { status: 400 });
    if (!course.price) return NextResponse.json({ error: "Course has no price" }, { status: 400 });

    // Already enrolled?
    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: session.userId, courseId } },
    });
    if (existing) return NextResponse.json({ error: "Already enrolled in this course" }, { status: 400 });

    // Calculate final price
    const basePrice = course.discountPrice && Number(course.discountPrice) < Number(course.price)
      ? Number(course.discountPrice)
      : Number(course.price);

    let finalAmount = basePrice;
    let discountAmt = 0;
    let couponId: string | undefined;

    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
      if (!coupon) return NextResponse.json({ error: "Invalid coupon code" }, { status: 400 });
      if (coupon.expiresAt && coupon.expiresAt < new Date())
        return NextResponse.json({ error: "Coupon has expired" }, { status: 400 });
      if (coupon.maxUses && coupon.uses >= coupon.maxUses)
        return NextResponse.json({ error: "Coupon usage limit reached" }, { status: 400 });
      if (coupon.courseId && coupon.courseId !== courseId)
        return NextResponse.json({ error: "Coupon not valid for this course" }, { status: 400 });

      discountAmt = coupon.discountType === "PERCENTAGE"
        ? (finalAmount * Number(coupon.discount)) / 100
        : Math.min(Number(coupon.discount), finalAmount);
      finalAmount = Math.max(0, finalAmount - discountAmt);
      couponId = coupon.id;
    }

    // ── Ensure Stripe customer exists with name + address (India export compliance) ──
    const stripe      = getStripe();
    const customerName = user.name ?? user.email;
    let customerId    = user.stripeCustomerId ?? undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email:    user.email,
        name:     customerName,
        address:  { line1: "India", country: "IN" },
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    } else {
      // Ensure existing customer has name + address for India compliance
      await stripe.customers.update(customerId, {
        name:    customerName,
        address: { line1: "India", country: "IN" },
      });
    }

    // Resolve dynamic revenue split
    const basePercent = course.instructorRevenuePercent ?? 70;
    let saleSource:        "ORGANIC" | "REFERRAL" | "COUPON" | "ADS" = "ORGANIC";
    let instructorPercent  = basePercent;
    let referralLinkId: string | null = null;

    if (referralCode) {
      const link = await prisma.referralLink.findUnique({
        where:  { code: referralCode },
        select: { id: true, instructorId: true, courseId: true, isActive: true },
      });
      if (link?.isActive && link.instructorId === course.createdById &&
          (!link.courseId || link.courseId === courseId)) {
        saleSource        = "REFERRAL";
        instructorPercent = 90;
        referralLinkId    = link.id;
        await prisma.referralLink.update({ where: { id: link.id }, data: { totalClicks: { increment: 1 } } }).catch(() => null);
      }
    } else if (couponId) {
      const couponRecord = await prisma.coupon.findUnique({ where: { id: couponId }, select: { createdById: true, courseId: true } });
      const isInstructorCoupon =
        couponRecord?.createdById === course.createdById ||
        couponRecord?.courseId   === courseId;
      saleSource        = "COUPON";
      instructorPercent = isInstructorCoupon ? 85 : basePercent;
    }

    const instructorRevenue = parseFloat(((finalAmount * instructorPercent) / 100).toFixed(2));
    const platformRevenue   = parseFloat((finalAmount - instructorRevenue).toFixed(2));

    // Create pending order
    const order = await prisma.order.create({
      data: {
        userId:            session.userId,
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

    // Create PaymentIntent with customer attached (satisfies RBI export requirements)
    const pi = await stripe.paymentIntents.create({
      amount:               Math.round(finalAmount * 100), // paise
      currency:             "inr",
      customer:             customerId,
      payment_method_types: ["card"],
      description:          `Course purchase: ${course.title}`,
      metadata:             { orderId: order.id, courseId, userId: session.userId },
      receipt_email:        user.email,
    });

    // Save PaymentIntent ID to order
    await prisma.order.update({
      where: { id: order.id },
      data:  { stripePaymentId: pi.id },
    });

    return NextResponse.json({
      clientSecret: pi.client_secret,
      orderId:      order.id,
      amount:       finalAmount,
      courseName:   course.title,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
