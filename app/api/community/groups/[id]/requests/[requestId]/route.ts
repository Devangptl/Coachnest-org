/**
 * PATCH /api/community/groups/[id]/requests/[requestId]
 * Approve or reject a join request (admin only).
 * Body: { action: "approve" | "reject" }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: groupId, requestId } = await params;
    const { action } = await req.json();

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const membership = await prisma.studyGroupMember.findUnique({
      where: { userId_groupId: { userId: session.userId, groupId } },
    });
    if (!membership || membership.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const joinRequest = await prisma.groupJoinRequest.findUnique({
      where: { id: requestId },
      include: { group: { select: { name: true, maxMembers: true, _count: { select: { members: true } } } } },
    });

    if (!joinRequest || joinRequest.groupId !== groupId) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    if (joinRequest.status !== "PENDING") {
      return NextResponse.json({ error: "Request already processed" }, { status: 400 });
    }

    if (action === "approve") {
      if (joinRequest.group._count.members >= joinRequest.group.maxMembers) {
        return NextResponse.json({ error: "Group is full" }, { status: 400 });
      }

      await prisma.$transaction([
        prisma.groupJoinRequest.update({
          where: { id: requestId },
          data: { status: "APPROVED" },
        }),
        prisma.studyGroupMember.create({
          data: { userId: joinRequest.userId, groupId, role: "MEMBER" },
        }),
        prisma.studyGroup.update({
          where: { id: groupId },
          data: { groupXp: { increment: 10 } },
        }),
        prisma.notification.create({
          data: {
            userId: joinRequest.userId,
            title: "Join request approved",
            body: `Your request to join "${joinRequest.group.name}" was approved!`,
            type: "JOIN_REQUEST",
            link: `/community/groups/${groupId}`,
          },
        }),
      ]);

      await prisma.activityFeedEvent.create({
        data: {
          userId: joinRequest.userId,
          type: "GROUP_JOINED",
          title: `Joined study group "${joinRequest.group.name}"`,
          meta: { groupId },
        },
      });
    } else {
      await prisma.$transaction([
        prisma.groupJoinRequest.update({
          where: { id: requestId },
          data: { status: "REJECTED" },
        }),
        prisma.notification.create({
          data: {
            userId: joinRequest.userId,
            title: "Join request declined",
            body: `Your request to join "${joinRequest.group.name}" was not approved.`,
            type: "JOIN_REQUEST",
            link: `/community/groups`,
          },
        }),
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/community/groups/[id]/requests/[requestId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
