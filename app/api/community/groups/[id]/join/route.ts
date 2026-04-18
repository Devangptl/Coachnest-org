/**
 * POST /api/community/groups/[id]/join — join a study group
 * If the group requires approval, creates a pending join request instead.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFeatureAccess } from "@/lib/feature-access";
import { createNotification } from "@/lib/notifications";
import { emit } from "@/lib/realtime/emit";
import { channels, events } from "@/lib/realtime/channels";

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
    const body = await req.json().catch(() => ({}));
    const message: string | undefined = body.message;

    const group = await prisma.studyGroup.findUnique({
      where: { id: groupId },
      include: { _count: { select: { members: true } } },
    });

    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    if (group._count.members >= group.maxMembers) {
      return NextResponse.json({ error: "Group is full" }, { status: 400 });
    }

    // Check if already a member
    const existing = await prisma.studyGroupMember.findUnique({
      where: { userId_groupId: { userId: session.userId, groupId } },
    });
    if (existing) return NextResponse.json({ error: "Already a member" }, { status: 400 });

    // ── Private group: create join request for admin approval ─
    if (!group.isPublic) {
      const existingRequest = await prisma.groupJoinRequest.findUnique({
        where: { userId_groupId: { userId: session.userId, groupId } },
      });

      if (existingRequest) {
        if (existingRequest.status === "PENDING") {
          return NextResponse.json({ error: "Join request already pending" }, { status: 400 });
        }
        // Reopen rejected request
        await prisma.groupJoinRequest.update({
          where: { id: existingRequest.id },
          data: { status: "PENDING", message: message || null },
        });
      } else {
        await prisma.groupJoinRequest.create({
          data: { groupId, userId: session.userId, message: message || null },
        });
      }

      // Notify the group admin (best-effort — don't fail the request if this throws)
      try {
        const admin = await prisma.studyGroupMember.findFirst({
          where: { groupId, role: "ADMIN" },
        });
        if (admin) {
          await createNotification({
            data: {
              userId: admin.userId,
              title: "New join request",
              body: `Someone wants to join your group "${group.name}".`,
              type: "JOIN_REQUEST",
              link: `/community/groups/${groupId}`,
            },
          });
        }
      } catch (notifErr) {
        console.warn("[join] Notification creation failed (non-fatal):", notifErr);
      }

      return NextResponse.json({ requested: true }, { status: 201 });
    }

    // ── Open group: direct membership ───────────────────────
    await prisma.studyGroupMember.create({
      data: { userId: session.userId, groupId, role: "MEMBER" },
    });

    await prisma.studyGroup.update({
      where: { id: groupId },
      data: { groupXp: { increment: 10 } },
    });

    const activity = await prisma.activityFeedEvent.create({
      data: {
        userId: session.userId,
        type: "GROUP_JOINED",
        title: `Joined study group "${group.name}"`,
        meta: { groupId },
      },
    });
    await emit(channels.activityFeed(), events.activityCreated, activity);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/community/groups/[id]/join]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
