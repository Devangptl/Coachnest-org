/**
 * GET /api/community/forums/[id] — get thread with replies
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();

    const thread = await prisma.forumThread.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        replies: {
          include: {
            author: { select: { id: true, name: true, avatar: true } },
            votes: true,
            _count: { select: { children: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Compute vote scores and user's vote for each reply
    const repliesWithScores = thread.replies.map((reply) => {
      const score = reply.votes.reduce((sum, v) => sum + v.value, 0);
      const userVote = session
        ? reply.votes.find((v) => v.userId === session.userId)?.value || 0
        : 0;
      const { votes, ...rest } = reply;
      return { ...rest, score, userVote };
    });

    return NextResponse.json({
      thread: { ...thread, replies: repliesWithScores },
    });
  } catch (err) {
    console.error("[GET /api/community/forums/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
