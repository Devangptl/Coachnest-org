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
import {
  createRouteLinkedAccount,
  setupRouteSettlement,
  createRouteTransfer,
} from "@/lib/razorpay";
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

    // ── PROCESS — Razorpay Route transfer ─────────────────────────────────────
    if (action === "PROCESS") {
      if (request.status !== "APPROVED") {
        return NextResponse.json({ error: "Only APPROVED requests can be processed." }, { status: 400 });
      }

      const bank = request.bankDetails as {
        accountHolder?: string;
        accountNumber?: string;
        ifsc?:          string;
        bankName?:      string;
        pan?:           string;
      } | null;

      if (!bank?.accountNumber || !bank?.ifsc || !bank?.accountHolder) {
        return NextResponse.json(
          { error: "Bank details are incomplete (accountHolder, accountNumber, IFSC required)." },
          { status: 400 }
        );
      }
      if (!bank?.pan) {
        return NextResponse.json(
          { error: "PAN number is missing. Instructor must re-submit the payout request with their PAN." },
          { status: 400 }
        );
      }

      // Reuse the linked account from a previous processed payout for this instructor
      let linkedAccountId = request.razorpayLinkedAccountId ?? undefined;
      if (!linkedAccountId) {
        const prev = await prisma.payoutRequest.findFirst({
          where:   { instructorId: request.instructorId, razorpayLinkedAccountId: { not: null } },
          select:  { razorpayLinkedAccountId: true },
          orderBy: { requestedAt: "desc" },
        });
        linkedAccountId = prev?.razorpayLinkedAccountId ?? undefined;
      }

      // First-ever Route payout for this instructor — create linked account
      if (!linkedAccountId) {
        const account = await createRouteLinkedAccount(
          instructorEmail ?? `${request.instructorId}@payouts.internal`,
          instructorName,
          bank.pan,
        );
        linkedAccountId = account.id;

        // Request Route product + configure bank settlement.
        // Non-blocking — Razorpay may need a short review before activation.
        // If it fails, the admin can configure it in the Razorpay dashboard.
        setupRouteSettlement(
          linkedAccountId,
          bank.accountHolder,
          bank.accountNumber,
          bank.ifsc,
        ).catch((err) => {
          console.warn("[PROCESS] setupRouteSettlement failed — settle via Razorpay dashboard:", err?.message);
        });
      }

      // Initiate the Route transfer (idempotent — safe to retry on network failure)
      const transfer = await createRouteTransfer(linkedAccountId, amount, id);

      await prisma.$transaction([
        prisma.payoutRequest.update({
          where: { id },
          data:  {
            status:                  "PROCESSED",
            adminNotes:              adminNotes?.trim() || null,
            processedAt:             new Date(),
            razorpayLinkedAccountId: linkedAccountId,
            razorpayTransferId:      transfer.id,
            razorpayTransferStatus:  transfer.status,
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
            description: `Payout of ₹${amount.toLocaleString()} transferred via Razorpay Route — ${transfer.id}`,
            meta:        { razorpayTransferId: transfer.id, razorpayTransferStatus: transfer.status },
          },
        }),
      ]);

      if (instructorEmail) {
        sendPayoutProcessedEmail(instructorEmail, instructorName, amountStr).catch(() => null);
      }

      return NextResponse.json({
        message:                `₹${amountStr} transferred via Razorpay Route.`,
        razorpayTransferId:     transfer.id,
        razorpayTransferStatus: transfer.status,
      });
    }

    return NextResponse.json({ message: `Payout request ${action.toLowerCase()}d.` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error.";
    console.error("[PUT /api/admin/payouts/:id]", err);

    // Surface a clear activation message for the most common Route setup error
    if (msg.includes("not found on the server") || msg.includes("404")) {
      return NextResponse.json(
        { error: "Razorpay Route is not activated on your account. Go to Razorpay Dashboard → Route → Get Started to enable it, then retry." },
        { status: 502 }
      );
    }

    const status = msg.includes("Razorpay") ? 502 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
