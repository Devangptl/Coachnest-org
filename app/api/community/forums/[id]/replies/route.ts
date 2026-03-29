/**
 * POST /api/community/forums/[id]/replies — add reply to a thread
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlanAccess } from "@/services/subscription.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const planAccess = await getPlanAccess(session.userId);
    if (!planAccess.hasInstructorQA) {
      return NextResponse.json(
        { error: "Posting replies requires a Pro or Enterprise subscription.", requiredPlan: "PRO" },
        { status: 403 }
      );
    }

    const { id: threadId } = await params;
    const { body, parentId } = await req.json();

    if (!body?.trim()) {
      return NextResponse.json({ error: "Reply body is required" }, { status: 400 });
    }

    // Verify thread exists
    const thread = await prisma.forumThread.findUnique({ where: { id: threadId } });
    if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

    const reply = await prisma.forumReply.create({
      data: {
        body: body.trim(),
        threadId,
        authorId: session.userId,
        parentId: parentId || null,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Notify thread author if different from replier
    if (thread.authorId !== session.userId) {
      await prisma.notification.create({
        data: {
          userId: thread.authorId,
          title: "New reply to your thread",
          body: `${session.name} replied to "${thread.title}"`,
          type: "FORUM_REPLY",
          link: `/community/forums/${threadId}`,
        },
      });
    }

    return NextResponse.json({ reply }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/community/forums/[id]/replies]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
