/**
 * POST /api/razorpay/webhook
 * Razorpay webhook — safety-net for org subscription payments that succeeded
 * but whose in-browser callback or UPI poll never completed (e.g. tab closed).
 *
 * Events handled:
 *   payment.captured  — primary: card + UPI payments confirmed by Razorpay
 *   order.paid        — redundant backup; same effect, idempotent
 *   payment.failed    — logs only (no user-facing action needed server-side)
 *   refund.processed  — confirm razorpayRefundId on OrganizationTransaction
 *   refund.failed     — mark org transaction refund back to FAILED for retry
 *
 * Security:
 *   Signature = HMAC-SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)
 *   compared to X-Razorpay-Signature header.
 *
 * Idempotency:
 *   finalizeOrgSubscriptionPayment checks status === "PENDING" and returns
 *   early — safe to call even if the browser flow already finalized it.
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { finalizeOrgSubscriptionPayment } from "@/services/org-subscription.service";

export const runtime = "nodejs";

// Razorpay expects a 200 response quickly — return 200 for all recognised
// events (even ones we skip) so Razorpay stops retrying.
const OK = () => NextResponse.json({ received: true });

function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET is not set");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return expected === signature;
}

export async function POST(req: NextRequest) {
  const rawBody  = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  try {
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn("[webhook] Signature mismatch — request rejected");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Signature check failed";
    console.error("[webhook]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  let event: { event: string; payload: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event: eventName, payload } = event;

  if (eventName === "payment.failed") {
    const payment = (payload as any)?.payment?.entity;
    console.warn("[webhook] payment.failed", payment?.id, payment?.error_description);
    return OK();
  }

  // ── Refund events (org subscription transactions) ─────────────────────────
  if (eventName === "refund.processed") {
    const entity      = (payload as any)?.refund?.entity;
    const rzpRefundId = entity?.id as string | undefined;
    const orgTxnId    = entity?.notes?.orgTransactionId as string | undefined;
    if (rzpRefundId && orgTxnId) {
      await prisma.organizationTransaction.updateMany({
        where: { id: orgTxnId, refundStatus: "PROCESSING", razorpayRefundId: null },
        data:  { razorpayRefundId: rzpRefundId },
      }).catch(() => null);
    }
    return OK();
  }

  if (eventName === "refund.failed") {
    const entity   = (payload as any)?.refund?.entity;
    const orgTxnId = entity?.notes?.orgTransactionId as string | undefined;
    if (orgTxnId) {
      await prisma.organizationTransaction.updateMany({
        where: { id: orgTxnId, refundStatus: "PROCESSING" },
        data:  { refundStatus: "FAILED" },
      }).catch(() => null);
      console.warn("[webhook] refund.failed for org transaction", orgTxnId, entity?.id);
    }
    return OK();
  }

  if (eventName === "payment.captured" || eventName === "order.paid") {
    const paymentEntity = (payload as any)?.payment?.entity;
    const rzpOrderId    = paymentEntity?.order_id  as string | undefined;
    const rzpPaymentId  = paymentEntity?.id        as string | undefined;

    if (!rzpOrderId || !rzpPaymentId) {
      console.warn("[webhook] Missing order_id or payment id in payload");
      return OK();
    }

    try {
      const orgTxn = await prisma.organizationTransaction.findUnique({
        where:  { razorpayOrderId: rzpOrderId },
        select: { id: true, status: true },
      });

      if (orgTxn) {
        if (orgTxn.status === "PENDING") {
          await finalizeOrgSubscriptionPayment(orgTxn.id, rzpPaymentId);
        }
      } else {
        console.warn("[webhook] No org transaction found for razorpayOrderId", rzpOrderId);
      }
    } catch (err) {
      console.error("[webhook] Finalization error for order", rzpOrderId, err);
      // Still return 200 — a 5xx would cause Razorpay to keep retrying
    }
    return OK();
  }

  // Unrecognised event — acknowledge and ignore
  return OK();
}
