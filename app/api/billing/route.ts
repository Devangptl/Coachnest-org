/**
 * GET /api/billing
 * Returns the current user's billing details from Stripe:
 *   - invoices (last 24)
 *   - default payment method (card details)
 *   - upcoming invoice amount (if active subscription)
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where:  { id: session.userId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      return NextResponse.json({
        invoices:       [],
        paymentMethod:  null,
        upcomingAmount: null,
      });
    }

    const stripe     = getStripe();
    const customerId = user.stripeCustomerId;

    // Fetch invoices, customer (for default PM), and upcoming invoice in parallel
    const [invoicesRes, customer] = await Promise.all([
      stripe.invoices.list({ customer: customerId, limit: 24, expand: ["data.payment_intent"] }),
      stripe.customers.retrieve(customerId, {
        expand: ["invoice_settings.default_payment_method"],
      }),
    ]);

    // ── Payment method ──────────────────────────────────────────────────────
    let paymentMethod: {
      brand: string; last4: string; expMonth: number; expYear: number; id: string;
    } | null = null;

    const cust = customer as Stripe.Customer;
    const pm   = cust.invoice_settings?.default_payment_method as Stripe.PaymentMethod | null;

    if (pm?.card) {
      paymentMethod = {
        id:       pm.id,
        brand:    pm.card.brand,
        last4:    pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear:  pm.card.exp_year,
      };
    } else {
      // Fall back to listing saved cards
      const pms = await stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 1 });
      const card = pms.data[0];
      if (card?.card) {
        paymentMethod = {
          id:       card.id,
          brand:    card.card.brand,
          last4:    card.card.last4,
          expMonth: card.card.exp_month,
          expYear:  card.card.exp_year,
        };
      }
    }

    // ── Upcoming invoice ────────────────────────────────────────────────────
    let upcomingAmount: number | null = null;
    let upcomingDate:   string | null = null;
    try {
      const upcoming = await stripe.invoices.createPreview({ customer: customerId });
      upcomingAmount = upcoming.amount_due;
      const nextAttempt = (upcoming as any).next_payment_attempt;
      upcomingDate = nextAttempt ? new Date(nextAttempt * 1000).toISOString() : null;
    } catch {
      // No upcoming invoice (cancelled / no active sub)
    }

    // ── Shape invoices ──────────────────────────────────────────────────────
    const invoices = invoicesRes.data.map((inv) => ({
      id:          inv.id,
      number:      inv.number,
      status:      inv.status,
      amountDue:   inv.amount_due,
      amountPaid:  inv.amount_paid,
      currency:    inv.currency,
      created:     new Date(inv.created * 1000).toISOString(),
      periodStart: new Date(inv.period_start * 1000).toISOString(),
      periodEnd:   new Date(inv.period_end   * 1000).toISOString(),
      pdfUrl:      inv.invoice_pdf,
      hostedUrl:   inv.hosted_invoice_url,
    }));

    return NextResponse.json({ invoices, paymentMethod, upcomingAmount, upcomingDate });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
