/**
 * POST /api/community/groups/[id]/join — join a study group
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFeatureAccess } from "@/lib/feature-access";

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
          error: "Joining study groups requires purchasing the Community add-on.",
          featureSlug: "community",
        },
        { status: 403 }
      );
    }

    const { id: groupId } = await params;

    const group = await prisma.studyGroup.findUnique({
      where: { id: groupId },
      include: { _count: { select: { members: true } } },
    });

    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    // Check capacity
    if (group._count.members >= group.maxMembers) {
      return NextResponse.json({ error: "Group is full" }, { status: 400 });
    }

    // Check if already a member
    const existing = await prisma.studyGroupMember.findUnique({
      where: { userId_groupId: { userId: session.userId, groupId } },
    });
    if (existing) return NextResponse.json({ error: "Already a member" }, { status: 400 });

    await prisma.studyGroupMember.create({
      data: { userId: session.userId, groupId, role: "MEMBER" },
    });

    // Award group XP for new member
    await prisma.studyGroup.update({
      where: { id: groupId },
      data: { groupXp: { increment: 10 } },
    });

    // Activity event
    await prisma.activityFeedEvent.create({
      data: {
        userId: session.userId,
        type: "GROUP_JOINED",
        title: `Joined study group "${group.name}"`,
        meta: { groupId },
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/community/groups/[id]/join]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
