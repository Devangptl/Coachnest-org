/**
 * PATCH /api/notifications/[id] — mark a single notification as read
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emit } from "@/lib/realtime/emit";
import { channels, events } from "@/lib/realtime/channels";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await prisma.notification.updateMany({
      where: { id, userId: session.userId },
      data:  { read: true },
    });

    await emit(
      channels.userNotifications(session.userId),
      events.notificationRead,
      { id },
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/notifications/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
