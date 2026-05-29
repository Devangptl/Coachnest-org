/**
 * PUT /api/admin/payouts/[id]
 * Approve, reject, or process a payout request.
 *
 * Body: { action: "APPROVE" | "REJECT" | "PROCESS", adminNotes? }
 *
 * APPROVE  → status APPROVED  (balance held, awaiting transfer)
 * REJECT   → status REJECTED  + refund balance back to instructor wallet
 * PROCESS  → Razorpay Route transfer: creates linked account (first time) +
 *             requests Route settlement + initiates transfer, then PROCESSED
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPayoutLink } from "@/lib/razorpay";
import {
  sendPayoutApprovedEmail,
  sendPayoutRejectedEmail,
  sendPayoutProcessedEmail,
} from "@/lib/email";

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
      include: {
        wallet:     true,
        instructor: { select: { name: true, email: true } },
      },
    });
    if (!request) return NextResponse.json({ error: "Not found." }, { status: 404 });

    const amount          = Number(request.amount);
    const instructorEmail = request.instructor?.email;
    const instructorName  = request.instructor?.name ?? "Instructor";
    const amountStr       = amount.toLocaleString("en-IN");

    // ── APPROVE ───────────────────────────────────────────────────────────────
    if (action === "APPROVE") {
      if (request.status !== "PENDING") {
        return NextResponse.json({ error: "Only PENDING requests can be approved." }, { status: 400 });
      }
      await prisma.payoutRequest.update({
        where: { id },
        data:  { status: "APPROVED", adminNotes: adminNotes?.trim() || null },
      });
      if (instructorEmail) {
        sendPayoutApprovedEmail(instructorEmail, instructorName, amountStr).catch(() => null);
      }
    }

    // ── REJECT ────────────────────────────────────────────────────────────────
    if (action === "REJECT") {
      if (!["PENDING", "APPROVED"].includes(request.status)) {
        return NextResponse.json({ error: "Cannot reject this request." }, { status: 400 });
      }
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
      if (instructorEmail) {
        sendPayoutRejectedEmail(instructorEmail, instructorName, amountStr, adminNotes?.trim()).catch(() => null);
      }
    }

    // ── PROCESS — Razorpay Payout Link ───────────────────────────────────────
    if (action === "PROCESS") {
      if (request.status !== "APPROVED") {
        return NextResponse.json({ error: "Only APPROVED requests can be processed." }, { status: 400 });
      }
      if (!instructorEmail) {
        return NextResponse.json({ error: "Instructor email not found." }, { status: 400 });
      }

      // Create payout link — Razorpay emails it to the instructor who then
      // enters their own bank/UPI details on Razorpay's hosted page
      const link = await createPayoutLink(
        amount,
        instructorName,
        instructorEmail,
        `Payout of ₹${amountStr} from Coachnest`,
        id,
      );

      await prisma.$transaction([
        prisma.payoutRequest.update({
          where: { id },
          data:  {
            status:                 "PROCESSED",
            adminNotes:             adminNotes?.trim() || null,
            processedAt:            new Date(),
            razorpayTransferId:     link.id,
            razorpayTransferStatus: link.status,
            bankDetails:            { payoutLinkId: link.id, payoutLinkUrl: link.short_url },
          },
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
            description: `Payout of ₹${amount.toLocaleString()} — payout link sent to ${instructorEmail}`,
            meta:        { payoutLinkId: link.id, payoutLinkUrl: link.short_url },
          },
        }),
      ]);

      if (instructorEmail) {
        sendPayoutProcessedEmail(instructorEmail, instructorName, amountStr).catch(() => null);
      }

      return NextResponse.json({
        message:       `Payout link sent to ${instructorEmail}.`,
        payoutLinkId:  link.id,
        payoutLinkUrl: link.short_url,
        status:        link.status,
      });
    }

    return NextResponse.json({ message: `Payout request ${action.toLowerCase()}d.` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error.";
    console.error("[PUT /api/admin/payouts/:id]", err);

    const status = msg.includes("Razorpay") ? 502 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
