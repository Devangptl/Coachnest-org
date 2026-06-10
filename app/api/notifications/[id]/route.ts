/**
 * PATCH /api/notifications/[id] — set a single notification's read state.
 * Body: { read?: boolean } — defaults to true (mark as read).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emit } from "@/lib/realtime/emit";
import { channels, events } from "@/lib/realtime/channels";

const patchSchema = z.object({ read: z.boolean().optional().default(true) });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { read } = parsed.data;

    const { id } = await params;
    await prisma.notification.updateMany({
      where: { id, userId: session.userId },
      data:  { read },
    });

    await emit(
      channels.userNotifications(session.userId),
      events.notificationRead,
      { id, read },
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/notifications/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
