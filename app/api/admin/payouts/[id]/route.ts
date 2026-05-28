/**
 * PUT /api/admin/payouts/[id]
 * Approve, reject, or process a payout request.
 *
 * Body: { action: "APPROVE" | "REJECT" | "PROCESS", adminNotes? }
 *
 * APPROVE  → status APPROVED  (balance stays debited, awaiting transfer)
 * REJECT   → status REJECTED  + refund balance back to instructor wallet
 * PROCESS  → creates RazorpayX Contact + Fund Account + Payout, then
 *             status PROCESSED + totalWithdrawn incremented
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createRazorpayContact,
  createRazorpayFundAccount,
  createRazorpayPayout,
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

    // ── PROCESS — Razorpay transfer if configured, otherwise manual ──────────
    if (action === "PROCESS") {
      if (request.status !== "APPROVED") {
        return NextResponse.json({ error: "Only APPROVED requests can be processed." }, { status: 400 });
      }

      const useRazorpay = !!process.env.RAZORPAY_ACCOUNT_NUMBER;

      let razorpayPayoutId:     string | undefined;
      let razorpayPayoutStatus: string | undefined;
      let razorpayContactId:    string | undefined;
      let razorpayFundAccountId: string | undefined;

      if (useRazorpay) {
        // Validate bank details before attempting transfer
        const bank = request.bankDetails as {
          accountHolder?: string;
          accountNumber?: string;
          ifsc?:          string;
          bankName?:      string;
        } | null;

        if (!bank?.accountNumber || !bank?.ifsc || !bank?.accountHolder) {
          return NextResponse.json(
            { error: "Bank details are incomplete. Cannot initiate Razorpay transfer." },
            { status: 400 }
          );
        }

        // 1. Create RazorpayX Contact
        razorpayContactId = request.razorpayContactId ?? undefined;
        if (!razorpayContactId) {
          const contact = await createRazorpayContact(
            instructorName,
            instructorEmail ?? `${id}@payouts.internal`,
          );
          razorpayContactId = contact.id;
        }

        // 2. Create Fund Account (bank account linked to contact)
        razorpayFundAccountId = request.razorpayFundAccountId ?? undefined;
        if (!razorpayFundAccountId) {
          const fa = await createRazorpayFundAccount(
            razorpayContactId,
            bank.accountHolder,
            bank.accountNumber,
            bank.ifsc,
          );
          razorpayFundAccountId = fa.id;
        }

        // 3. Initiate Payout
        const payout = await createRazorpayPayout(
          razorpayFundAccountId,
          amount,
          id,
          instructorName,
        );
        razorpayPayoutId     = payout.id;
        razorpayPayoutStatus = payout.status;
      }

      // Update DB atomically (works for both manual and Razorpay modes)
      await prisma.$transaction([
        prisma.payoutRequest.update({
          where: { id },
          data:  {
            status:               "PROCESSED",
            adminNotes:           adminNotes?.trim() || null,
            processedAt:          new Date(),
            ...(razorpayContactId    && { razorpayContactId }),
            ...(razorpayFundAccountId && { razorpayFundAccountId }),
            ...(razorpayPayoutId      && { razorpayPayoutId }),
            ...(razorpayPayoutStatus  && { razorpayPayoutStatus }),
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
            description: razorpayPayoutId
              ? `Payout of ₹${amount.toLocaleString()} processed — Razorpay ${razorpayPayoutId}`
              : `Payout of ₹${amount.toLocaleString()} marked as processed (manual transfer)`,
            meta: razorpayPayoutId
              ? { razorpayPayoutId, razorpayPayoutStatus }
              : {},
          },
        }),
      ]);

      if (instructorEmail) {
        sendPayoutProcessedEmail(instructorEmail, instructorName, amountStr).catch(() => null);
      }

      return NextResponse.json({
        message: razorpayPayoutId
          ? `Payout of ₹${amountStr} initiated via Razorpay.`
          : `Payout of ₹${amountStr} marked as processed.`,
        ...(razorpayPayoutId && { razorpayPayoutId, payoutStatus: razorpayPayoutStatus }),
      });
    }

    return NextResponse.json({ message: `Payout request ${action.toLowerCase()}d.` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error.";
    console.error("[PUT /api/admin/payouts/:id]", err);
    // If Razorpay payout call failed, surface the error to the admin
    const status = msg.includes("Razorpay") ? 502 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
