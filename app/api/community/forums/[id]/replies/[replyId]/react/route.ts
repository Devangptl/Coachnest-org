/**
 * POST /api/community/forums/[id]/replies/[replyId]/react — toggle an emoji
 * reaction on a reply. Body: { emoji: string }. Re-posting the same emoji
 * removes it (toggle behaviour).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED = ["👍", "❤️", "🎉", "💡", "🚀", "👀"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; replyId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: threadId, replyId } = await params;
    const { emoji } = await req.json();
    if (!ALLOWED.includes(emoji)) {
      return NextResponse.json({ error: "Unsupported reaction" }, { status: 400 });
    }

    const reply = await prisma.forumReply.findUnique({
      where: { id: replyId },
      select: { threadId: true },
    });
    if (!reply || reply.threadId !== threadId) {
      return NextResponse.json({ error: "Reply not found in this thread" }, { status: 400 });
    }

    const existing = await prisma.forumReaction.findUnique({
      where: { userId_replyId_emoji: { userId: session.userId, replyId, emoji } },
    });

    if (existing) {
      await prisma.forumReaction.delete({ where: { id: existing.id } });
      return NextResponse.json({ reacted: false, emoji });
    }

    await prisma.forumReaction.create({
      data: { userId: session.userId, replyId, emoji },
    });
    return NextResponse.json({ reacted: true, emoji });
  } catch (err) {
    console.error("[POST .../replies/[replyId]/react]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
