/**
 * GET /api/admin/payouts — list all payout requests (admin only)
 * Query params: status? (PENDING|APPROVED|REJECTED|PROCESSED)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const statusFilter = req.nextUrl.searchParams.get("status") as string | null;

  try {
    const requests = await prisma.payoutRequest.findMany({
      where:   statusFilter ? { status: statusFilter as never } : undefined,
      include: {
        instructor: { select: { id: true, name: true, email: true, avatar: true } },
        wallet:     { select: { totalEarned: true, totalWithdrawn: true } },
      },
      orderBy: { requestedAt: "desc" },
    });

    // Summary stats
    const stats = await prisma.payoutRequest.groupBy({
      by:     ["status"],
      _sum:   { amount: true },
      _count: { id: true },
    });

    return NextResponse.json({
      requests: requests.map((r) => ({
        ...r,
        amount:        Number(r.amount),
        totalEarned:   Number(r.wallet?.totalEarned    ?? 0),
        totalWithdrawn: Number(r.wallet?.totalWithdrawn ?? 0),
      })),
      stats: stats.map((s) => ({
        status: s.status,
        count:  s._count.id,
        total:  Number(s._sum.amount ?? 0),
      })),
    });
  } catch (err) {
    console.error("[GET /api/admin/payouts]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
