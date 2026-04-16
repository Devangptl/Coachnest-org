/**
 * POST /api/community/groups/[id]/leave — leave a study group
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

    const { id: groupId } = await params;

    const membership = await prisma.studyGroupMember.findUnique({
      where: { userId_groupId: { userId: session.userId, groupId } },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 400 });
    }

    // Don't allow the group creator (ADMIN) to leave, they should delete the group
    const group = await prisma.studyGroup.findUnique({ where: { id: groupId } });
    if (group?.createdById === session.userId) {
      return NextResponse.json({ error: "Group creator cannot leave. Transfer ownership or delete the group." }, { status: 400 });
    }

    await prisma.studyGroupMember.delete({
      where: { userId_groupId: { userId: session.userId, groupId } },
    });

    // Clean up any join request so the user can re-request later
    await prisma.groupJoinRequest.deleteMany({
      where: { userId: session.userId, groupId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/community/groups/[id]/leave]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
