/**
 * DELETE /api/billing/payment-methods/[id]  — detach (remove) a saved card
 * PATCH  /api/billing/payment-methods/[id]  — set card as default payment method
 *
 * Both routes verify the payment method belongs to the authenticated user's Stripe customer
 * before modifying it to prevent unauthorized access.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

type RouteCtx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where:  { id: session.userId },
      select: { stripeCustomerId: true },
    });
    if (!user?.stripeCustomerId) {
      return NextResponse.json({ error: "No billing account" }, { status: 400 });
    }

    const stripe = getStripe();

    // Verify the PM belongs to this customer
    const pm = await stripe.paymentMethods.retrieve(id);
    if (pm.customer !== user.stripeCustomerId) {
      return NextResponse.json({ error: "Payment method not found" }, { status: 404 });
    }

    await stripe.paymentMethods.detach(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(_req: NextRequest, { params }: RouteCtx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where:  { id: session.userId },
      select: { stripeCustomerId: true },
    });
    if (!user?.stripeCustomerId) {
      return NextResponse.json({ error: "No billing account" }, { status: 400 });
    }

    const stripe = getStripe();

    // Verify the PM belongs to this customer
    const pm = await stripe.paymentMethods.retrieve(id);
    if (pm.customer !== user.stripeCustomerId) {
      return NextResponse.json({ error: "Payment method not found" }, { status: 404 });
    }

    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: { default_payment_method: id },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
