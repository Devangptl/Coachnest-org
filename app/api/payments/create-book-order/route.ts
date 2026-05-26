/**
 * POST /api/payments/create-book-order
 * Body: { couponCode?: string }
 * Returns: { orderId, sessionId, url } — redirect the user to `url`.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createBookCheckoutSession } from "@/services/book-payment.service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { couponCode?: string } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine
  }

  try {
    const result = await createBookCheckoutSession(session.userId, body.couponCode);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create checkout session";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
