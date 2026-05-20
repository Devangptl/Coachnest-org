/**
 * POST   /api/community/forums/[id]/bookmark — bookmark a thread
 * DELETE /api/community/forums/[id]/bookmark — remove the bookmark
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: threadId } = await params;
    const thread = await prisma.forumThread.findUnique({
      where: { id: threadId },
      select: { id: true },
    });
    if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

    await prisma.forumBookmark.upsert({
      where: { userId_threadId: { userId: session.userId, threadId } },
      update: {},
      create: { userId: session.userId, threadId },
    });
    return NextResponse.json({ bookmarked: true });
  } catch (err) {
    console.error("[POST /api/community/forums/[id]/bookmark]", err);
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

    const { id: threadId } = await params;
    await prisma.forumBookmark.deleteMany({
      where: { userId: session.userId, threadId },
    });
    return NextResponse.json({ bookmarked: false });
  } catch (err) {
    console.error("[DELETE /api/community/forums/[id]/bookmark]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
