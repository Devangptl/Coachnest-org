/**
 * POST /api/billing/setup-intent
 * Creates a Stripe SetupIntent so the client can securely save a card via Stripe.js.
 * SetupIntent uses usage="off_session" so the saved card can be used for future subscriptions.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where:  { id: session.userId },
      select: { id: true, email: true, name: true, stripeCustomerId: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const stripe = getStripe();

    // Ensure a Stripe customer exists
    let customerId = user.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email:    user.email,
        name:     user.name ?? undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    }

    // Create SetupIntent — off_session so the card can be charged without the user present
    const setupIntent = await stripe.setupIntents.create({
      customer:             customerId,
      payment_method_types: ["card"],
      usage:                "off_session",
    });

    return NextResponse.json({ clientSecret: setupIntent.client_secret });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
