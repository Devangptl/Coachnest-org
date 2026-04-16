/**
 * GET /api/community/groups/[id] — group detail with members
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();

    const [group, myRequest] = await Promise.all([
      prisma.studyGroup.findUnique({
        where: { id },
        include: {
          createdBy: { select: { id: true, name: true, avatar: true } },
          members: {
            include: {
              user: { select: { id: true, name: true, avatar: true } },
            },
            orderBy: { joinedAt: "asc" },
          },
          _count: { select: { members: true, notes: true, joinRequests: { where: { status: "PENDING" } } } },
        },
      }),
      session
        ? prisma.groupJoinRequest.findUnique({
            where: { userId_groupId: { userId: session.userId, groupId: id } },
            select: { id: true, status: true, createdAt: true },
          })
        : null,
    ]);

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    return NextResponse.json({ group, myRequest: myRequest ?? null });
  } catch (err) {
    console.error("[GET /api/community/groups/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
