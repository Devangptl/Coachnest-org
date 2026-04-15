/**
 * POST /api/admin/orders/[id]/refund
 *
 * Admin-triggered full refund bypass: creates a RefundRequest at 0% progress
 * (so the full amount is returned) and immediately processes it.
 * Useful for edge-cases like payment disputes, admin corrections, etc.
 *
 * For normal student-initiated refunds use:
 *   POST /api/refunds (student submits) → POST /api/admin/refunds/[id]/approve (admin approves)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { amount, reason } = body;

    if (!amount) {
      return NextResponse.json({ error: "Refund amount is required." }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where:   { id },
      include: { course: { select: { id: true, title: true, createdById: true } } },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    if (order.status !== "PAID") {
      return NextResponse.json({ error: "Only PAID orders can be refunded." }, { status: 400 });
    }

    // Check if a RefundRequest already exists; if so, reject duplicate
    const existing = await prisma.refundRequest.findUnique({ where: { orderId: id } });
    if (existing && existing.status === "PROCESSED") {
      return NextResponse.json({ error: "Order has already been refunded." }, { status: 409 });
    }

    // ── 1. Stripe refund ──────────────────────────────────────────────────────
    let stripeRefundId: string | undefined;
    if (order.stripePaymentId) {
      try {
        const stripe = getStripe();
        const refund = await stripe.refunds.create(
          {
            payment_intent: order.stripePaymentId,
            amount:         Math.round(Number(amount) * 100),
            reason:         "requested_by_customer",
          },
          { idempotencyKey: `admin-refund-order-${id}` }
        );
        stripeRefundId = refund.id;
      } catch (stripeErr: unknown) {
        const msg = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
        console.error("[refund] Stripe refund failed:", msg);
        return NextResponse.json({ error: `Stripe refund failed: ${msg}` }, { status: 502 });
      }
    }

    const instructorRevenue = Number(order.instructorRevenue ?? 0);
    const platformRevenue   = Number(order.platformRevenue   ?? 0);
    const refundAmt         = Number(amount);
    // Pro-rate: instructorLoss = instructorRevenue × (refund / order.amount)
    const ratio             = refundAmt / Number(order.amount);
    const instructorLoss    = parseFloat((instructorRevenue * ratio).toFixed(2));
    const platformLoss      = parseFloat((platformRevenue   * ratio).toFixed(2));

    await prisma.$transaction(async (tx) => {
      // Create or update RefundRequest for audit trail
      const rr = await tx.refundRequest.upsert({
        where:  { orderId: id },
        create: {
          orderId:         id,
          userId:          order.userId,
          courseId:        order.courseId ?? "__admin__",
          progressPercent: 0,
          completedLessons: 0,
          totalLessons:    0,
          originalAmount:  Number(order.amount),
          refundPercent:   (refundAmt / Number(order.amount)) * 100,
          refundAmount:    refundAmt,
          instructorLoss,
          platformLoss,
          reason:          reason || "Admin-issued refund",
          adminId:         session.userId,
          status:          "PROCESSED",
          stripeRefundId,
          reviewedAt:      new Date(),
          processedAt:     new Date(),
        },
        update: {
          status:        "PROCESSED",
          adminId:       session.userId,
          adminNotes:    reason,
          stripeRefundId,
          reviewedAt:    new Date(),
          processedAt:   new Date(),
        },
      });

      // Revoke enrollment
      if (order.courseId) {
        await tx.enrollment.deleteMany({
          where: { userId: order.userId, courseId: order.courseId },
        }).catch(() => null);
      }

      // Debit instructor wallet
      if (instructorLoss > 0 && order.course?.createdById) {
        const wallet = await tx.instructorWallet.findUnique({
          where: { userId: order.course.createdById },
        });
        if (wallet) {
          await tx.instructorWallet.update({
            where: { id: wallet.id },
            data:  {
              balance:     { decrement: instructorLoss },
              totalEarned: { decrement: instructorLoss },
            },
          });
          await tx.walletTransaction.create({
            data: {
              walletId:    wallet.id,
              orderId:     id,
              amount:      instructorLoss,
              type:        "DEBIT",
              description: `Admin refund reversal${reason ? `: ${reason}` : ""}`,
              meta:        { refundRequestId: rr.id, ratio, courseTitle: order.course.title },
            },
          });
        }
      }

      // Ledger entries
      await tx.ledgerEntry.createMany({
        data: [
          {
            orderId:         id,
            refundRequestId: rr.id,
            userId:          order.userId,
            courseId:        order.courseId,
            type:            "REFUND",
            amount:          refundAmt,
            description:     `Admin refund — ₹${refundAmt}${reason ? ` (${reason})` : ""}`,
            meta:            { adminId: session.userId, stripeRefundId },
          },
          {
            orderId:         id,
            refundRequestId: rr.id,
            userId:          order.userId,
            courseId:        order.courseId,
            type:            "REFUND_REVERSAL_INSTRUCTOR",
            amount:          instructorLoss,
            description:     `Instructor share reversed — ₹${instructorLoss}`,
            meta:            {},
          },
          {
            orderId:         id,
            refundRequestId: rr.id,
            userId:          order.userId,
            courseId:        order.courseId,
            type:            "REFUND_REVERSAL_PLATFORM",
            amount:          platformLoss,
            description:     `Platform share reversed — ₹${platformLoss}`,
            meta:            {},
          },
        ],
      });

      await tx.order.update({ where: { id }, data: { status: "REFUNDED" } });
    });

    const updated = await prisma.order.findUnique({ where: { id } });

    return NextResponse.json(
      { message: "Refund processed successfully.", data: updated },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/admin/orders/[id]/refund]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
