/**
 * POST /api/payments/create-feature-payment-intent
 * Creates a Stripe PaymentIntent for an in-app feature add-on purchase.
 * Body:     { featureId }   (DB id OR slug)
 * Response: { clientSecret, orderId, amount, featureName }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { featureId: rawId, paymentMethodType } = await req.json() as {
      featureId:           string;
      paymentMethodType?:  string;
    };
    if (!rawId) return NextResponse.json({ error: "featureId is required" }, { status: 400 });

    const [user, feature] = await Promise.all([
      prisma.user.findUnique({
        where:  { id: session.userId },
        select: { id: true, email: true, name: true, stripeCustomerId: true },
      }),
      prisma.platformFeature.findFirst({
        where:  { OR: [{ id: rawId }, { slug: rawId }] },
        select: { id: true, name: true, slug: true, price: true, isActive: true },
      }),
    ]);

    if (!user)    return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (!feature) return NextResponse.json({ error: "Feature not found" }, { status: 404 });
    if (!feature.isActive) return NextResponse.json({ error: "This feature is not currently available" }, { status: 400 });

    // Already purchased?
    const existing = await prisma.featurePurchase.findUnique({
      where: { userId_featureId: { userId: session.userId, featureId: feature.id } },
    });
    if (existing) return NextResponse.json({ error: "You already have access to this feature" }, { status: 400 });

    const amount = Number(feature.price);

    // Ensure Stripe customer exists
    const stripe = getStripe();
    const customerName = user.name ?? user.email;
    let customerId = user.stripeCustomerId ?? undefined;

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
      await stripe.customers.update(customerId, {
        name:    customerName,
        address: { line1: "India", country: "IN" },
      });
    }

    // Create pending order — 100% platform revenue for add-ons
    const order = await prisma.order.create({
      data: {
        userId:           session.userId,
        featureId:        feature.id,
        amount,
        currency:         "INR",
        status:           "PENDING",
        instructorRevenue: 0,
        platformRevenue:   amount,
      },
    });

    // Create PaymentIntent — setup_future_usage saves eligible payment methods to the customer
    const pi = await stripe.paymentIntents.create({
      amount:        Math.round(amount * 100), // paise
      currency:      "inr",
      customer:      customerId,
      ...(paymentMethodType === "upi"
        ? { payment_method_types: ["upi"] }
        : { automatic_payment_methods: { enabled: true }, setup_future_usage: "off_session" as const }),
      description:   `Platform add-on: ${feature.name}`,
      metadata:      { orderId: order.id, featureId: feature.id, userId: session.userId, type: "feature" },
      receipt_email: user.email,
    });

    await prisma.order.update({
      where: { id: order.id },
      data:  { stripePaymentId: pi.id },
    });

    return NextResponse.json({
      clientSecret: pi.client_secret,
      orderId:      order.id,
      amount,
      featureName:  feature.name,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
