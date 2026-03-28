/**
 * GET  /api/community/groups/[id]/notes — list shared notes
 * POST /api/community/groups/[id]/notes — create a note (members only)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: groupId } = await params;

    const membership = await prisma.studyGroupMember.findUnique({
      where: { userId_groupId: { userId: session.userId, groupId } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
    }
    const notes = await prisma.groupNote.findMany({
      where: { groupId },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ notes });
  } catch (err) {
    console.error("[GET /api/community/groups/[id]/notes]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: groupId } = await params;
    const { title, content } = await req.json();
    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    // Must be a member
    const membership = await prisma.studyGroupMember.findUnique({
      where: { userId_groupId: { userId: session.userId, groupId } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
    }

    const note = await prisma.groupNote.create({
      data: {
        groupId,
        authorId: session.userId,
        title: title.trim(),
        content: content.trim(),
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Award group XP for contributing a note
    await prisma.studyGroup.update({
      where: { id: groupId },
      data: { groupXp: { increment: 25 } },
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/community/groups/[id]/notes]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
