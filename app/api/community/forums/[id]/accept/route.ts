/**
 * POST /api/community/forums/[id]/accept — set (or clear) the accepted answer.
 * Only the thread author may accept a reply. Body: { replyId: string | null }.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: threadId } = await params;
    const { replyId } = await req.json();

    const thread = await prisma.forumThread.findUnique({
      where: { id: threadId },
      select: { authorId: true, title: true, acceptedReplyId: true },
    });
    if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    if (thread.authorId !== session.userId) {
      return NextResponse.json({ error: "Only the thread author can accept an answer" }, { status: 403 });
    }

    // Clearing the accepted answer
    if (!replyId) {
      await prisma.forumThread.update({
        where: { id: threadId },
        data: { acceptedReplyId: null, isResolved: false },
      });
      return NextResponse.json({ ok: true, acceptedReplyId: null });
    }

    const reply = await prisma.forumReply.findUnique({
      where: { id: replyId },
      select: { threadId: true, authorId: true },
    });
    if (!reply || reply.threadId !== threadId) {
      return NextResponse.json({ error: "Reply not found in this thread" }, { status: 400 });
    }

    await prisma.forumThread.update({
      where: { id: threadId },
      data: { acceptedReplyId: replyId, isResolved: true },
    });

    // Notify the answerer (unless they accepted their own reply)
    if (reply.authorId !== session.userId && thread.acceptedReplyId !== replyId) {
      await createNotification({
        data: {
          userId: reply.authorId,
          title: "Your reply was accepted as the answer",
          body: `${session.name} marked your reply on "${thread.title}" as the answer`,
          type: "FORUM_REPLY",
          link: `/community/forums/${threadId}`,
        },
      });
    }

    return NextResponse.json({ ok: true, acceptedReplyId: replyId });
  } catch (err) {
    console.error("[POST /api/community/forums/[id]/accept]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
