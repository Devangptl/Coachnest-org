/**
 * PATCH  /api/community/forums/[id]/replies/[replyId] — edit a reply (author only)
 * DELETE /api/community/forums/[id]/replies/[replyId] — delete a reply (author or admin)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emit } from "@/lib/realtime/emit";
import { channels, events } from "@/lib/realtime/channels";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; replyId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: threadId, replyId } = await params;
    const { body } = await req.json();
    if (!body?.trim()) {
      return NextResponse.json({ error: "Body is required" }, { status: 400 });
    }

    const reply = await prisma.forumReply.findUnique({
      where: { id: replyId },
      select: { authorId: true, threadId: true },
    });
    if (!reply) return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    if (reply.threadId !== threadId) {
      return NextResponse.json({ error: "Reply does not belong to this thread" }, { status: 400 });
    }
    if (reply.authorId !== session.userId) {
      return NextResponse.json({ error: "Not your reply" }, { status: 403 });
    }

    const updated = await prisma.forumReply.update({
      where: { id: replyId },
      data: { body: body.trim() },
      include: { author: { select: { id: true, name: true, avatar: true } } },
    });

    await emit(channels.forumThread(threadId), events.forumReplyCreated, { reply: updated });
    return NextResponse.json({ reply: updated });
  } catch (err) {
    console.error("[PATCH /api/community/forums/[id]/replies/[replyId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; replyId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: threadId, replyId } = await params;
    const reply = await prisma.forumReply.findUnique({
      where: { id: replyId },
      select: { authorId: true, threadId: true },
    });
    if (!reply) return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    if (reply.threadId !== threadId) {
      return NextResponse.json({ error: "Reply does not belong to this thread" }, { status: 400 });
    }

    const isAdmin = session.role === "ADMIN" || session.role === "INSTRUCTOR";
    if (reply.authorId !== session.userId && !isAdmin) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    await prisma.forumReply.delete({ where: { id: replyId } });
    await emit(channels.forumThread(threadId), events.forumReplyCreated, { deletedId: replyId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/community/forums/[id]/replies/[replyId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
