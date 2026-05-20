/**
 * GET /api/instructors/[id] — public instructor summary + follow state.
 * Powers the instructor hover card. Returns 404 when the id is not an
 * instructor/admin.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInstructorPublicCard } from "@/services/instructor.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const instructor = await getInstructorPublicCard(id);
  if (!instructor) {
    return NextResponse.json({ error: "Instructor not found" }, { status: 404 });
  }

  const session = await getSession();
  const [followerCount, followRecord] = await Promise.all([
    prisma.userInstructorFollow.count({ where: { instructorId: id } }),
    session
      ? prisma.userInstructorFollow.findUnique({
          where: {
            userId_instructorId: { userId: session.userId, instructorId: id },
          },
          select: { id: true },
        })
      : null,
  ]);

  return NextResponse.json({
    instructor,
    follow: { isFollowing: Boolean(followRecord), followerCount },
    isLoggedIn: Boolean(session),
  });
}
