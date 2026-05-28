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

    // ── PROCESS — initiate actual Razorpay bank transfer ─────────────────────
    if (action === "PROCESS") {
      if (request.status !== "APPROVED") {
        return NextResponse.json({ error: "Only APPROVED requests can be processed." }, { status: 400 });
      }

      // Validate bank details are present
      const bank = request.bankDetails as {
        accountHolder?: string;
        accountNumber?: string;
        ifsc?:          string;
        bankName?:      string;
      } | null;

      if (!bank?.accountNumber || !bank?.ifsc || !bank?.accountHolder) {
        return NextResponse.json(
          { error: "Bank details are incomplete. Cannot initiate transfer." },
          { status: 400 }
        );
      }

      // ── 1. Create RazorpayX Contact ────────────────────────────────────────
      let contactId = request.razorpayContactId;
      if (!contactId) {
        const contact = await createRazorpayContact(
          instructorName,
          instructorEmail ?? `${id}@payouts.internal`,
        );
        contactId = contact.id;
      }

      // ── 2. Create Fund Account (bank account linked to contact) ───────────
      let fundAccountId = request.razorpayFundAccountId;
      if (!fundAccountId) {
        const fa = await createRazorpayFundAccount(
          contactId,
          bank.accountHolder,
          bank.accountNumber,
          bank.ifsc,
        );
        fundAccountId = fa.id;
      }

      // ── 3. Initiate Payout ────────────────────────────────────────────────
      const payout = await createRazorpayPayout(
        fundAccountId,
        amount,
        id,
        instructorName,
      );

      // ── 4. Save IDs + update DB atomically ────────────────────────────────
      await prisma.$transaction([
        prisma.payoutRequest.update({
          where: { id },
          data:  {
            status:               "PROCESSED",
            adminNotes:           adminNotes?.trim() || null,
            processedAt:          new Date(),
            razorpayContactId:    contactId,
            razorpayFundAccountId: fundAccountId,
            razorpayPayoutId:     payout.id,
            razorpayPayoutStatus: payout.status,
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
            description: `Payout of ₹${amount.toLocaleString()} processed — Razorpay ${payout.id}`,
            meta:        { razorpayPayoutId: payout.id, razorpayPayoutStatus: payout.status },
          },
        }),
      ]);

      if (instructorEmail) {
        sendPayoutProcessedEmail(instructorEmail, instructorName, amountStr).catch(() => null);
      }

      return NextResponse.json({
        message:         `Payout of ₹${amountStr} initiated successfully.`,
        razorpayPayoutId: payout.id,
        payoutStatus:    payout.status,
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
