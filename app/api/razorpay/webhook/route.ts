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
import { createNotification } from "@/lib/notifications";

// ── Webhook events handled ──────────────────────────────────────────────────
// payment.captured      — finalize order (primary safety net)
// order.paid            — finalize order (redundant backup)
// payment.failed        — log only
// refund.processed      — confirm razorpayRefundId on RefundRequest
// refund.failed         — mark RefundRequest back to FAILED so admin can retry
// payout_link.processed — payout link claimed; update razorpayTransferStatus
// transfer.settled      — Route transfer settled to instructor bank; update status
// transfer.failed       — Route transfer failed; reset PayoutRequest to APPROVED for retry

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

  // ── Payout link events ───────────────────────────────────────────────────
  if (eventName === "payout_link.processed") {
    const entity       = (payload as any)?.payout_link?.entity;
    const payoutLinkId = entity?.id as string | undefined;
    if (payoutLinkId) {
      await prisma.payoutRequest.updateMany({
        where: { razorpayTransferId: payoutLinkId },
        data:  { razorpayTransferStatus: "processed" },
      }).catch(() => null);
    }
    return OK();
  }

  if (eventName === "payout_link.cancelled" || eventName === "payout_link.expired") {
    const entity       = (payload as any)?.payout_link?.entity;
    const payoutLinkId = entity?.id as string | undefined;
    if (payoutLinkId) {
      const pr = await prisma.payoutRequest.findFirst({
        where:   { razorpayTransferId: payoutLinkId },
        include: { wallet: true },
      }).catch(() => null);

      if (pr && pr.status === "PROCESSED") {
        const amount = Number(pr.amount);
        const state  = eventName.split(".")[1]; // "cancelled" | "expired"
        await prisma.$transaction([
          prisma.payoutRequest.update({
            where: { id: pr.id },
            data:  { status: "APPROVED", razorpayTransferStatus: state },
          }),
          prisma.instructorWallet.update({
            where: { id: pr.walletId },
            data:  { balance: { increment: amount }, totalWithdrawn: { decrement: amount } },
          }),
          prisma.walletTransaction.create({
            data: {
              walletId:    pr.walletId,
              amount,
              type:        "CREDIT",
              description: `Payout link ${state} — ₹${amount.toLocaleString()} returned to wallet`,
              meta:        { payoutLinkId },
            },
          }),
        ]).catch(() => null);

        createNotification({
          data: {
            userId: pr.instructorId,
            title:  `Payout Link ${state.charAt(0).toUpperCase() + state.slice(1)}`,
            body:   `Your payout link of ₹${amount.toLocaleString("en-IN")} has ${state}. The amount has been returned to your wallet — please submit a new payout request.`,
            type:   "SYSTEM",
            link:   "/instructor/payouts",
          },
        }).catch(() => null);
      }
    }
    return OK();
  }

  // ── Route transfer events ────────────────────────────────────────────────
  if (eventName === "transfer.settled") {
    const entity     = (payload as any)?.transfer?.entity;
    const transferId = entity?.id as string | undefined;
    if (transferId) {
      const pr = await prisma.payoutRequest.findUnique({
        where:  { razorpayTransferId: transferId },
        select: { id: true, amount: true, instructorId: true },
      }).catch(() => null);

      if (pr) {
        await prisma.payoutRequest.update({
          where: { id: pr.id },
          data:  { razorpayTransferStatus: "settled" },
        }).catch(() => null);

        const amt = Number(pr.amount).toLocaleString("en-IN");
        createNotification({
          data: {
            userId: pr.instructorId,
            title:  "Payout Settled",
            body:   `Your payout of ₹${amt} has been settled to your bank account.`,
            type:   "SYSTEM",
            link:   "/instructor/payouts",
          },
        }).catch(() => null);
      }
    }
    return OK();
  }

  if (eventName === "transfer.failed") {
    const entity     = (payload as any)?.transfer?.entity;
    const transferId = entity?.id as string | undefined;
    if (transferId) {
      const pr = await prisma.payoutRequest.findUnique({
        where:   { razorpayTransferId: transferId },
        include: { wallet: true },
      }).catch(() => null);

      if (pr && pr.status === "PROCESSED") {
        const amount = Number(pr.amount);
        await prisma.$transaction([
          // Reset to APPROVED so admin can retry PROCESS
          prisma.payoutRequest.update({
            where: { id: pr.id },
            data:  { status: "APPROVED", razorpayTransferStatus: "failed" },
          }),
          // Return amount to wallet balance; undo totalWithdrawn increment
          prisma.instructorWallet.update({
            where: { id: pr.walletId },
            data:  {
              balance:        { increment: amount },
              totalWithdrawn: { decrement: amount },
            },
          }),
          prisma.walletTransaction.create({
            data: {
              walletId:    pr.walletId,
              amount,
              type:        "CREDIT",
              description: `Transfer reversal — Route transfer ${transferId} failed`,
              meta:        { razorpayTransferId: transferId },
            },
          }),
        ]).catch(() => null);

        const amt = amount.toLocaleString("en-IN");
        createNotification({
          data: {
            userId: pr.instructorId,
            title:  "Payout Transfer Failed",
            body:   `Your payout of ₹${amt} could not be transferred. The amount has been returned to your wallet. Please contact support or re-submit the request.`,
            type:   "SYSTEM",
            link:   "/instructor/payouts",
          },
        }).catch(() => null);

        console.error("[webhook] transfer.failed — payout", pr.id, "transfer", transferId);
      }
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
    // PAID = already finalised; REFUNDED = do not re-process or re-enroll
    if (order.status === "PAID" || order.status === "REFUNDED") return;

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
    if (bookOrder.status === "PAID" || bookOrder.status === "REFUNDED") return;
    await finalizeBookPayment(bookOrder.id, rzpPaymentId);
    return;
  }

  console.warn("[webhook] No order found for razorpayOrderId", rzpOrderId);
}
