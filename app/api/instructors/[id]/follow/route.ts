/**
 * GET    /api/instructors/[id]/follow — follow status + follower count (public)
 * POST   /api/instructors/[id]/follow — follow instructor (auth required)
 * DELETE /api/instructors/[id]/follow — unfollow instructor (auth required)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: instructorId } = await params;
  const session = await getSession();

  const [followerCount, followRecord] = await Promise.all([
    prisma.userInstructorFollow.count({ where: { instructorId } }),
    session
      ? prisma.userInstructorFollow.findUnique({
          where: { userId_instructorId: { userId: session.userId, instructorId } },
          select: { id: true },
        })
      : null,
  ]);

  return NextResponse.json({ isFollowing: Boolean(followRecord), followerCount });
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { id: instructorId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.userId === instructorId)
    return NextResponse.json({ error: "You cannot follow yourself" }, { status: 400 });

  // Verify target is actually an instructor
  const instructor = await prisma.user.findUnique({
    where: { id: instructorId },
    select: { id: true, role: true },
  });
  if (!instructor || !["INSTRUCTOR", "ADMIN"].includes(instructor.role))
    return NextResponse.json({ error: "Instructor not found" }, { status: 404 });

  await prisma.userInstructorFollow.upsert({
    where:  { userId_instructorId: { userId: session.userId, instructorId } },
    create: { userId: session.userId, instructorId },
    update: {},
  });

  const followerCount = await prisma.userInstructorFollow.count({ where: { instructorId } });
  return NextResponse.json({ isFollowing: true, followerCount });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id: instructorId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.userInstructorFollow.deleteMany({
    where: { userId: session.userId, instructorId },
  });

  const followerCount = await prisma.userInstructorFollow.count({ where: { instructorId } });
  return NextResponse.json({ isFollowing: false, followerCount });
}
