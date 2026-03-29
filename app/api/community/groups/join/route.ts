/**
 * POST /api/community/groups/join
 * Join a study group via an invite code.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlanAccess } from "@/services/subscription.service";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const planAccess = await getPlanAccess(session.userId);
    if (!planAccess.hasInstructorQA) {
      return NextResponse.json(
        { error: "Joining study groups requires a Pro or Enterprise subscription.", requiredPlan: "PRO" },
        { status: 403 }
      );
    }

    const { inviteCode } = await req.json();
    if (!inviteCode?.trim()) {
      return NextResponse.json({ error: "Invite code is required" }, { status: 400 });
    }

    const group = await prisma.studyGroup.findUnique({
      where: { inviteCode: inviteCode.trim() },
      include: { _count: { select: { members: true } } },
    });

    if (!group) {
      return NextResponse.json({ error: "Invalid invite code or group not found" }, { status: 404 });
    }

    // Check capacity
    if (group._count.members >= group.maxMembers) {
      return NextResponse.json({ error: "Group is full" }, { status: 400 });
    }

    // Check if already a member
    const existing = await prisma.studyGroupMember.findUnique({
      where: { userId_groupId: { userId: session.userId, groupId: group.id } },
    });
    if (existing) {
      // Return the group ID so the user can be redirected to it
      return NextResponse.json({ groupId: group.id, message: "Already a member" }, { status: 200 });
    }

    await prisma.studyGroupMember.create({
      data: { userId: session.userId, groupId: group.id, role: "MEMBER" },
    });

    // Award group XP for new member
    await prisma.studyGroup.update({
      where: { id: group.id },
      data: { groupXp: { increment: 10 } },
    });

    // Activity event
    await prisma.activityFeedEvent.create({
      data: {
        userId: session.userId,
        type: "GROUP_JOINED",
        title: `Joined study group "${group.name}"`,
        meta: { groupId: group.id },
      },
    });

    return NextResponse.json({ groupId: group.id }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/community/groups/join]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
