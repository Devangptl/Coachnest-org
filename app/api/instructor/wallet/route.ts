/**
 * GET /api/instructor/wallet
 * Returns the instructor's wallet balance + recent transactions.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "INSTRUCTOR" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const wallet = await prisma.instructorWallet.findUnique({
      where:   { userId: session.userId },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take:    50,
          select: {
            id: true, amount: true, type: true,
            description: true, meta: true, createdAt: true,
          },
        },
      },
    });

    const pendingPayout = await prisma.payoutRequest.aggregate({
      where: { instructorId: session.userId, status: "PENDING" },
      _sum:  { amount: true },
    });

    return NextResponse.json({
      wallet: wallet
        ? {
            balance:        Number(wallet.balance),
            totalEarned:    Number(wallet.totalEarned),
            totalWithdrawn: Number(wallet.totalWithdrawn),
            transactions:   wallet.transactions.map((t) => ({
              ...t,
              amount: Number(t.amount),
            })),
          }
        : { balance: 0, totalEarned: 0, totalWithdrawn: 0, transactions: [] },
      pendingPayoutAmount: Number(pendingPayout._sum.amount ?? 0),
    });
  } catch (err) {
    console.error("[GET /api/instructor/wallet]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
