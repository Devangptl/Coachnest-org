/**
 * PUT /api/admin/payouts/[id]
 * Approve, reject, or mark a payout request as processed.
 *
 * Body: { action: "APPROVE" | "REJECT" | "PROCESS", adminNotes? }
 *
 * APPROVE  → status APPROVED (balance stays debited, awaiting transfer)
 * REJECT   → status REJECTED + refund balance back to instructor wallet
 * PROCESS  → status PROCESSED + increment totalWithdrawn + log transaction
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;

  try {
    const { action, adminNotes } = await req.json();

    if (!["APPROVE", "REJECT", "PROCESS"].includes(action)) {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const request = await prisma.payoutRequest.findUnique({
      where:   { id },
      include: { wallet: true },
    });
    if (!request) return NextResponse.json({ error: "Not found." }, { status: 404 });

    const amount = Number(request.amount);

    if (action === "APPROVE") {
      if (request.status !== "PENDING") {
        return NextResponse.json({ error: "Only PENDING requests can be approved." }, { status: 400 });
      }
      await prisma.payoutRequest.update({
        where: { id },
        data: { status: "APPROVED", adminNotes: adminNotes?.trim() || null },
      });
    }

    if (action === "REJECT") {
      if (!["PENDING", "APPROVED"].includes(request.status)) {
        return NextResponse.json({ error: "Cannot reject this request." }, { status: 400 });
      }
      // Refund balance to wallet
      await prisma.$transaction([
        prisma.payoutRequest.update({
          where: { id },
          data:  { status: "REJECTED", adminNotes: adminNotes?.trim() || null, processedAt: new Date() },
        }),
        prisma.instructorWallet.update({
          where: { id: request.walletId },
          data:  { balance: { increment: amount } },
        }),
        prisma.walletTransaction.create({
          data: {
            walletId:    request.walletId,
            amount,
            type:        "CREDIT",
            description: `Payout rejected — ₹${amount.toLocaleString()} refunded`,
          },
        }),
      ]);
    }

    if (action === "PROCESS") {
      if (request.status !== "APPROVED") {
        return NextResponse.json({ error: "Only APPROVED requests can be processed." }, { status: 400 });
      }
      await prisma.$transaction([
        prisma.payoutRequest.update({
          where: { id },
          data:  { status: "PROCESSED", adminNotes: adminNotes?.trim() || null, processedAt: new Date() },
        }),
        prisma.instructorWallet.update({
          where: { id: request.walletId },
          data:  { totalWithdrawn: { increment: amount } },
        }),
        prisma.walletTransaction.create({
          data: {
            walletId:    request.walletId,
            amount,
            type:        "PAYOUT_PROCESSED",
            description: `Payout of ₹${amount.toLocaleString()} processed`,
          },
        }),
      ]);
    }

    return NextResponse.json({ message: `Payout request ${action.toLowerCase()}d.` });
  } catch (err) {
    console.error("[PUT /api/admin/payouts/:id]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
