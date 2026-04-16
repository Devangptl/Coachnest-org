/**
 * GET /api/community/groups/[id]/requests
 * Returns pending join requests for the group (admin only).
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
    if (!membership || membership.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requests = await prisma.groupJoinRequest.findMany({
      where: { groupId, status: "PENDING" },
      include: {
        user: { select: { id: true, name: true, avatar: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ requests });
  } catch (err) {
    console.error("[GET /api/community/groups/[id]/requests]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
