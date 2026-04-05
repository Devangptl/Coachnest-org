/**
 * GET /api/billing/payment-methods
 * Returns all saved cards for the current user along with which one is the default.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where:  { id: session.userId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      return NextResponse.json({ paymentMethods: [], defaultId: null });
    }

    const stripe = getStripe();

    const [pmsRes, customer] = await Promise.all([
      stripe.paymentMethods.list({ customer: user.stripeCustomerId, type: "card" }),
      stripe.customers.retrieve(user.stripeCustomerId, {
        expand: ["invoice_settings.default_payment_method"],
      }),
    ]);

    const cust      = customer as Stripe.Customer;
    const defaultPm = cust.invoice_settings?.default_payment_method;
    const defaultId = typeof defaultPm === "string"
      ? defaultPm
      : (defaultPm as Stripe.PaymentMethod | null)?.id ?? null;

    const paymentMethods = pmsRes.data.map((pm) => ({
      id:        pm.id,
      brand:     pm.card!.brand,
      last4:     pm.card!.last4,
      expMonth:  pm.card!.exp_month,
      expYear:   pm.card!.exp_year,
      isDefault: pm.id === defaultId,
    }));

    return NextResponse.json({ paymentMethods, defaultId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
