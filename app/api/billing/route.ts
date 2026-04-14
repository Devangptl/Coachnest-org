/**
 * GET /api/billing
 *
 * For STUDENT role:
 *   Returns purchase history from the platform DB (orders for courses + features).
 *   Students do not have Stripe subscription invoices.
 *
 * For INSTRUCTOR / ADMIN role:
 *   Returns Stripe billing details: invoices (last 24), default payment method,
 *   and upcoming invoice amount (if active subscription).
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

    // ── STUDENT: return order purchase history from the DB ────────────────────
    if (session.role === "STUDENT") {
      const orders = await prisma.order.findMany({
        where:   { userId: session.userId, status: "PAID" },
        select: {
          id:              true,
          amount:          true,
          currency:        true,
          status:          true,
          createdAt:       true,
          discountAmount:  true,
          course:          { select: { id: true, title: true, thumbnail: true } },
          feature:         { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        take:    50,
      });

      const totalSpent = orders.reduce((sum, o) => sum + Number(o.amount), 0);

      return NextResponse.json({
        accessModel: "purchase",
        orders: orders.map((o) => ({
          id:            o.id,
          amount:        Number(o.amount),
          currency:      o.currency,
          status:        o.status,
          createdAt:     o.createdAt,
          discountAmount: o.discountAmount ? Number(o.discountAmount) : null,
          type:          o.feature ? "feature" : "course",
          course:        o.course  ?? null,
          feature:       o.feature ?? null,
        })),
        summary: {
          totalOrders: orders.length,
          totalSpent,
          currency: "INR",
        },
        // No subscription invoices for students
        invoices:       [],
        paymentMethod:  null,
        upcomingAmount: null,
      });
    }

    // ── INSTRUCTOR / ADMIN: return Stripe invoice + payment method info ───────
    const user = await prisma.user.findUnique({
      where:  { id: session.userId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      return NextResponse.json({
        accessModel:    "subscription",
        invoices:       [],
        paymentMethod:  null,
        upcomingAmount: null,
      });
    }

    const stripe     = getStripe();
    const customerId = user.stripeCustomerId;

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
      const pms  = await stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 1 });
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
      const nextAttempt = (upcoming as unknown as { next_payment_attempt?: number }).next_payment_attempt;
      upcomingDate = nextAttempt ? new Date(nextAttempt * 1000).toISOString() : null;
    } catch {
      // No upcoming invoice (cancelled / no active sub)
    }

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

    return NextResponse.json({
      accessModel: "subscription",
      invoices,
      paymentMethod,
      upcomingAmount,
      upcomingDate,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
