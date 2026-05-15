/**
 * POST /api/community/forums/[id]/replies — add reply to a thread
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFeatureAccess } from "@/lib/feature-access";
import { createNotification } from "@/lib/notifications";
import { extractMentionIds } from "@/lib/mentions";
import { emit } from "@/lib/realtime/emit";
import { channels, events } from "@/lib/realtime/channels";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const canAccess = await hasFeatureAccess(session.userId, session.role, "community");
    if (!canAccess) {
      return NextResponse.json(
        {
          error: "Posting replies requires purchasing the Community add-on.",
          featureSlug: "community",
        },
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

    // Collect distinct userIds to notify (excluding the replier)
    const recipients = new Set<string>();
    if (thread.authorId !== session.userId) recipients.add(thread.authorId);

    // Notify the parent reply's author too (nested reply)
    if (parentId) {
      const parent = await prisma.forumReply.findUnique({
        where: { id: parentId },
        select: { authorId: true },
      });
      if (parent && parent.authorId !== session.userId) {
        recipients.add(parent.authorId);
      }
    }

    for (const userId of recipients) {
      await createNotification({
        data: {
          userId,
          title: parentId ? "Someone replied to your comment" : "New reply to your thread",
          body: `${session.name} replied to "${thread.title}"`,
          type: "FORUM_REPLY",
          link: `/community/forums/${threadId}`,
        },
      });
    }

    // Notify @mentioned users (skip the replier and anyone already notified)
    for (const userId of extractMentionIds(body)) {
      if (userId === session.userId || recipients.has(userId)) continue;
      await createNotification({
        data: {
          userId,
          title: "You were mentioned",
          body: `${session.name} mentioned you in "${thread.title}"`,
          type: "FORUM_REPLY",
          link: `/community/forums/${threadId}`,
        },
      });
    }

    await emit(channels.forumThread(threadId), events.forumReplyCreated, { reply });

    return NextResponse.json({ reply }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/community/forums/[id]/replies]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
