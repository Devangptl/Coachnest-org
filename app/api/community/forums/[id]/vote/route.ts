/**
 * POST /api/community/forums/[id]/vote — upvote/downvote a reply
 * Body: { replyId, value: 1 | -1 }
 * Toggling: if same vote already exists, remove it
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { replyId, value } = await req.json();
    if (!replyId || ![1, -1].includes(value)) {
      return NextResponse.json({ error: "replyId and value (1 or -1) required" }, { status: 400 });
    }

    const existing = await prisma.forumVote.findUnique({
      where: { userId_replyId: { userId: session.userId, replyId } },
    });

    if (existing) {
      if (existing.value === value) {
        // Toggle off — remove vote
        await prisma.forumVote.delete({ where: { id: existing.id } });
        return NextResponse.json({ action: "removed", value: 0 });
      }
      // Change vote direction
      await prisma.forumVote.update({ where: { id: existing.id }, data: { value } });
      return NextResponse.json({ action: "changed", value });
    }

    // New vote
    await prisma.forumVote.create({
      data: { userId: session.userId, replyId, value },
    });
    return NextResponse.json({ action: "created", value }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/community/forums/[id]/vote]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
