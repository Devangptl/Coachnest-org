/**
 * GET  /api/instructor/payout-requests — list the instructor's payout requests
 * POST /api/instructor/payout-requests — submit a new payout request
 *
 * Minimum payout threshold: ₹1,000
 * Only PENDING/APPROVED requests lock balance; REJECTED ones release it.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MIN_PAYOUT = 1000; // ₹1,000

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "INSTRUCTOR" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const requests = await prisma.payoutRequest.findMany({
      where:   { instructorId: session.userId },
      orderBy: { requestedAt: "desc" },
    });

    return NextResponse.json({
      requests: requests.map((r) => ({ ...r, amount: Number(r.amount) })),
    });
  } catch (err) {
    console.error("[GET /api/instructor/payout-requests]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "INSTRUCTOR" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const { amount, bankDetails, notes } = await req.json();

    if (!amount || isNaN(Number(amount))) {
      return NextResponse.json({ error: "Valid amount is required." }, { status: 400 });
    }
    const reqAmount = parseFloat(Number(amount).toFixed(2));
    if (reqAmount < MIN_PAYOUT) {
      return NextResponse.json(
        { error: `Minimum payout amount is ₹${MIN_PAYOUT.toLocaleString()}.` },
        { status: 400 }
      );
    }

    // Check wallet balance
    const wallet = await prisma.instructorWallet.findUnique({
      where: { userId: session.userId },
    });
    if (!wallet || Number(wallet.balance) < reqAmount) {
      return NextResponse.json(
        { error: "Insufficient wallet balance." },
        { status: 400 }
      );
    }

    // Check no already-pending request
    const pending = await prisma.payoutRequest.findFirst({
      where: { instructorId: session.userId, status: "PENDING" },
    });
    if (pending) {
      return NextResponse.json(
        { error: "You already have a pending payout request." },
        { status: 400 }
      );
    }

    // Create request + debit wallet balance (held until processed)
    const [request] = await prisma.$transaction([
      prisma.payoutRequest.create({
        data: {
          walletId:    wallet.id,
          instructorId: session.userId,
          amount:      reqAmount,
          bankDetails: bankDetails ?? null,
          notes:       notes?.trim() || null,
        },
      }),
      prisma.instructorWallet.update({
        where: { id: wallet.id },
        data:  { balance: { decrement: reqAmount } },
      }),
      prisma.walletTransaction.create({
        data: {
          walletId:    wallet.id,
          amount:      reqAmount,
          type:        "PAYOUT_REQUEST",
          description: `Payout request of ₹${reqAmount.toLocaleString()}`,
        },
      }),
    ]);

    return NextResponse.json({ request: { ...request, amount: Number(request.amount) } }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/instructor/payout-requests]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
