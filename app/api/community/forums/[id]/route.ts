/**
 * GET    /api/community/forums/[id] — get thread with replies
 * PATCH  /api/community/forums/[id] — edit thread (author only)
 * DELETE /api/community/forums/[id] — delete thread (author or admin)
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { title, body } = await req.json();

    const thread = await prisma.forumThread.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    if (thread.authorId !== session.userId) {
      return NextResponse.json({ error: "Not your thread" }, { status: 403 });
    }

    const data: Record<string, string> = {};
    if (typeof title === "string" && title.trim()) data.title = title.trim();
    if (typeof body === "string" && body.trim()) data.body = body.trim();
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const updated = await prisma.forumThread.update({
      where: { id },
      data,
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        _count: { select: { replies: true } },
      },
    });
    return NextResponse.json({ thread: updated });
  } catch (err) {
    console.error("[PATCH /api/community/forums/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const thread = await prisma.forumThread.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

    const isAdmin = session.role === "ADMIN" || session.role === "INSTRUCTOR";
    if (thread.authorId !== session.userId && !isAdmin) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    await prisma.forumThread.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/community/forums/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
