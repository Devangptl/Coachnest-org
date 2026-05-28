/**
 * GET /api/billing
 * Returns the authenticated user's order history and spend summary.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [orders, bookOrders] = await Promise.all([
      prisma.order.findMany({
        where:   { userId: session.userId, status: "PAID" },
        include: {
          course:  { select: { title: true } },
          feature: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take:    50,
      }),
      prisma.bookOrder.findMany({
        where:   { userId: session.userId, status: "PAID" },
        include: {
          items: { include: { book: { select: { title: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take:    50,
      }),
    ]);

    const courseAndFeatureRows = orders.map((o) => ({
      id:        o.id,
      type:      o.featureId ? "feature" : "course",
      amount:    Number(o.amount),
      status:    o.status,
      course:    o.course  ? { title: o.course.title }  : null,
      feature:   o.feature ? { name:  o.feature.name  } : null,
      createdAt: o.createdAt,
    }));

    const bookRows = bookOrders.map((bo) => ({
      id:        bo.id,
      type:      "books",
      amount:    Number(bo.amount),
      status:    bo.status,
      course:    { title: bo.items.map((i) => i.book.title).join(", ") },
      feature:   null,
      createdAt: bo.createdAt,
    }));

    const allOrders = [...courseAndFeatureRows, ...bookRows].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const totalSpent = allOrders.reduce((sum, o) => sum + o.amount, 0);

    return NextResponse.json({
      orders:  allOrders,
      summary: { totalOrders: allOrders.length, totalSpent },
    });
  } catch (err) {
    console.error("[GET /api/billing]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
