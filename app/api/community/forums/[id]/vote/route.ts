/**
 * POST /api/community/forums/[id]/vote — upvote/downvote a reply
 * Body: { replyId, value: 1 | -1 }
 * Toggling: if same vote already exists, remove it
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emit } from "@/lib/realtime/emit";
import { channels, events } from "@/lib/realtime/channels";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: threadId } = await params;
    const { replyId, value } = await req.json();
    if (!replyId || ![1, -1].includes(value)) {
      return NextResponse.json({ error: "replyId and value (1 or -1) required" }, { status: 400 });
    }

    const existing = await prisma.forumVote.findUnique({
      where: { userId_replyId: { userId: session.userId, replyId } },
    });

    let action: "removed" | "changed" | "created";
    let finalValue: number;
    let status = 200;

    if (existing) {
      if (existing.value === value) {
        await prisma.forumVote.delete({ where: { id: existing.id } });
        action = "removed";
        finalValue = 0;
      } else {
        await prisma.forumVote.update({ where: { id: existing.id }, data: { value } });
        action = "changed";
        finalValue = value;
      }
    } else {
      await prisma.forumVote.create({
        data: { userId: session.userId, replyId, value },
      });
      action = "created";
      finalValue = value;
      status = 201;
    }

    await emit(channels.forumThread(threadId), events.forumVoteChanged, {
      replyId, action, value: finalValue,
    });

    return NextResponse.json({ action, value: finalValue }, { status });
  } catch (err) {
    console.error("[POST /api/community/forums/[id]/vote]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
