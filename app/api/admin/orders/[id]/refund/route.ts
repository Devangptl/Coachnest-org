/**
 * POST /api/admin/orders/[id]/refund — Process refund for an order
 *
 * On refund:
 *  1. Issues Stripe refund via stripePaymentId (if present)
 *  2. Deletes the student's enrollment so they lose course access immediately
 *  3. Reverses the instructor wallet credit (DEBIT transaction)
 *  4. Marks the order as REFUNDED
 */
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
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

    // Fetch the full order
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    if (order.status !== "PAID") {
      return NextResponse.json({ error: "Only PAID orders can be refunded." }, { status: 400 });
    }

    // ── 1. Issue Stripe refund ─────────────────────────────────────────────────
    if (order.stripePaymentId) {
      try {
        const stripe = getStripe();
        await stripe.refunds.create({
          payment_intent: order.stripePaymentId,
          reason:         "requested_by_customer",
        });
      } catch (stripeErr: unknown) {
        const msg = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
        console.error("[refund] Stripe refund failed:", msg);
        return NextResponse.json(
          { error: `Stripe refund failed: ${msg}` },
          { status: 502 }
        );
      }
    }

    // ── 2. Delete enrollment (revoke course access) ────────────────────────────
    if (order.courseId && order.userId) {
      await prisma.enrollment.deleteMany({
        where: { userId: order.userId, courseId: order.courseId },
      }).catch(() => null); // OK if already absent
    }

    // ── 3. Reverse instructor wallet credit ────────────────────────────────────
    const instructorRevenue = Number(order.instructorRevenue ?? 0);
    if (instructorRevenue > 0 && order.courseId) {
      // Find the instructor's wallet via the course
      const course = await prisma.course.findUnique({
        where:  { id: order.courseId },
        select: { createdById: true },
      });
      if (course?.createdById) {
        const wallet = await prisma.instructorWallet.findUnique({
          where: { userId: course.createdById },
        });
        if (wallet) {
          await prisma.$transaction([
            prisma.instructorWallet.update({
              where: { id: wallet.id },
              data: {
                balance:     { decrement: instructorRevenue },
                totalEarned: { decrement: instructorRevenue },
              },
            }),
            prisma.walletTransaction.create({
              data: {
                walletId:    wallet.id,
                orderId:     order.id,
                amount:      instructorRevenue,
                type:        "DEBIT",
                description: `Refund for order — ₹${instructorRevenue.toLocaleString()} reversed${reason ? `: ${reason}` : ""}`,
              },
            }),
          ]);
        }
      }
    }

    // ── 4. Mark order as REFUNDED ──────────────────────────────────────────────
    const updated = await prisma.order.update({
      where: { id },
      data:  { status: "REFUNDED" },
    });

    return NextResponse.json(
      { message: "Refund processed successfully.", data: updated },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/admin/orders/[id]/refund]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
