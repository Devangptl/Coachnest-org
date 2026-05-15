/**
 * PATCH  /api/community/groups/[id]/notes/[noteId] — edit a note (author only)
 * DELETE /api/community/groups/[id]/notes/[noteId] — delete a note (author, group admin, or platform admin)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emit } from "@/lib/realtime/emit";
import { channels, events } from "@/lib/realtime/channels";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: groupId, noteId } = await params;
    const { title, content } = await req.json();

    const note = await prisma.groupNote.findUnique({
      where: { id: noteId },
      select: { authorId: true, groupId: true },
    });
    if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });
    if (note.groupId !== groupId) {
      return NextResponse.json({ error: "Note does not belong to this group" }, { status: 400 });
    }
    if (note.authorId !== session.userId) {
      return NextResponse.json({ error: "Not your note" }, { status: 403 });
    }

    const data: Record<string, string> = {};
    if (typeof title === "string" && title.trim()) data.title = title.trim();
    if (typeof content === "string" && content.trim()) data.content = content.trim();
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const updated = await prisma.groupNote.update({
      where: { id: noteId },
      data,
      include: { author: { select: { id: true, name: true, avatar: true } } },
    });

    await emit(channels.groupNotes(groupId), events.groupNoteCreated, { note: updated });
    return NextResponse.json({ note: updated });
  } catch (err) {
    console.error("[PATCH /api/community/groups/[id]/notes/[noteId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: groupId, noteId } = await params;
    const note = await prisma.groupNote.findUnique({
      where: { id: noteId },
      select: { authorId: true, groupId: true },
    });
    if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });
    if (note.groupId !== groupId) {
      return NextResponse.json({ error: "Note does not belong to this group" }, { status: 400 });
    }

    // Allow: note author, group admin, or platform admin/instructor
    const isPlatformAdmin = session.role === "ADMIN" || session.role === "INSTRUCTOR";
    let isGroupAdmin = false;
    if (!isPlatformAdmin && note.authorId !== session.userId) {
      const membership = await prisma.studyGroupMember.findUnique({
        where: { userId_groupId: { userId: session.userId, groupId } },
        select: { role: true },
      });
      isGroupAdmin = membership?.role === "ADMIN";
    }
    if (note.authorId !== session.userId && !isPlatformAdmin && !isGroupAdmin) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    await prisma.groupNote.delete({ where: { id: noteId } });

    // Reverse the +25 XP awarded on creation
    await prisma.studyGroup.update({
      where: { id: groupId },
      data: { groupXp: { decrement: 25 } },
    });

    await emit(channels.groupNotes(groupId), events.groupNoteCreated, { deletedId: noteId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/community/groups/[id]/notes/[noteId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
