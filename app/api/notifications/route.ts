/**
 * GET   /api/notifications          — list user's notifications
 * PATCH /api/notifications          — mark all as read
 * PATCH /api/notifications/[id]     — mark one as read
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const limit = Math.min(50, parseInt(req.nextUrl.searchParams.get("limit") ?? "20"));

    const [notifications, unread] = await Promise.all([
      prisma.notification.findMany({
        where:   { userId: session.userId },
        orderBy: { createdAt: "desc" },
        take:    limit,
      }),
      prisma.notification.count({
        where: { userId: session.userId, read: false },
      }),
    ]);

    return NextResponse.json({ notifications, unread });
  } catch (err) {
    console.error("[GET /api/notifications]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.notification.updateMany({
      where: { userId: session.userId, read: false },
      data:  { read: true },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/notifications]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
