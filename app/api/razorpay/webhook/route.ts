/**
 * POST /api/razorpay/webhook
 * Razorpay webhook — safety-net for payments that succeeded but whose
 * in-browser callback or UPI poll never completed (e.g. tab closed early).
 *
 * Events handled:
 *   payment.captured  — primary: card + UPI payments confirmed by Razorpay
 *   order.paid        — redundant backup; same effect, idempotent
 *   payment.failed    — logs only (no user-facing action needed server-side)
 *
 * Security:
 *   Signature = HMAC-SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)
 *   compared to X-Razorpay-Signature header.
 *   Set RAZORPAY_WEBHOOK_SECRET in Razorpay Dashboard → Settings → Webhooks.
 *
 * Idempotency:
 *   All finalize functions check order.status === "PAID" and return early —
 *   safe to call even if the browser flow already completed the order.
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { finalizeCoursePayment } from "@/services/payment.service";
import { finalizeBookPayment } from "@/services/book-payment.service";
import { handleFeaturePaymentSuccess } from "@/services/feature.service";

// ── Webhook events handled ──────────────────────────────────────────────────
// payment.captured  — finalize order (primary safety net)
// order.paid        — finalize order (redundant backup)
// payment.failed    — log only
// refund.processed  — confirm razorpayRefundId on RefundRequest
// refund.failed     — mark RefundRequest back to FAILED so admin can retry

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

  // ── Refund events ───────────────────────────────────────────────────────
  if (eventName === "refund.processed") {
    const entity = (payload as any)?.refund?.entity;
    const rzpRefundId    = entity?.id            as string | undefined;
    const refundReqId    = entity?.notes?.refundRequestId as string | undefined;
    if (rzpRefundId && refundReqId) {
      await prisma.refundRequest.updateMany({
        where: { id: refundReqId, status: "PROCESSING" },
        data:  { razorpayRefundId: rzpRefundId },
      }).catch(() => null);
    }
    return OK();
  }

  if (eventName === "refund.failed") {
    const entity      = (payload as any)?.refund?.entity;
    const refundReqId = entity?.notes?.refundRequestId as string | undefined;
    if (refundReqId) {
      await prisma.refundRequest.updateMany({
        where: { id: refundReqId, status: "PROCESSING" },
        data:  { status: "FAILED" },
      }).catch(() => null);
      console.warn("[webhook] refund.failed for request", refundReqId, entity?.id);
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
      await finalizeByRazorpayOrderId(rzpOrderId, rzpPaymentId);
    } catch (err) {
      console.error("[webhook] Finalization error for order", rzpOrderId, err);
      // Still return 200 — a 5xx would cause Razorpay to keep retrying
    }
    return OK();
  }

  // Unrecognised event — acknowledge and ignore
  return OK();
}

async function finalizeByRazorpayOrderId(
  rzpOrderId:  string,
  rzpPaymentId: string,
) {
  // 1. Check Order table (courses + features)
  const order = await prisma.order.findUnique({
    where:  { razorpayOrderId: rzpOrderId },
    select: { id: true, featureId: true, courseId: true, status: true },
  });

  if (order) {
    if (order.status === "PAID") return; // already done

    if (order.featureId) {
      await handleFeaturePaymentSuccess(order.id, rzpPaymentId);
    } else {
      const result = await finalizeCoursePayment(order.id, rzpPaymentId);
      if (result.courseId) revalidatePath(`/courses/${result.courseId}`);
    }
    return;
  }

  // 2. Check BookOrder table
  const bookOrder = await prisma.bookOrder.findUnique({
    where:  { razorpayOrderId: rzpOrderId },
    select: { id: true, status: true },
  });

  if (bookOrder) {
    if (bookOrder.status === "PAID") return;
    await finalizeBookPayment(bookOrder.id, rzpPaymentId);
    return;
  }

  console.warn("[webhook] No order found for razorpayOrderId", rzpOrderId);
}
