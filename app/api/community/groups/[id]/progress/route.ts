/**
 * GET /api/community/groups/[id]/progress — group progress tracking
 * Returns aggregate progress for all group members across their enrolled courses.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface MemberStat {
  user: { id: string; name: string; avatar: string | null } | undefined;
  completedLessons: number;
  totalEnrollments: number;
  xp: number;
  level: number;
  streak: number;
  badges: number;
  quizzesPassed: number;
}

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
    if (!membership) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
    }

    const group = await prisma.studyGroup.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
        },
      },
    });

    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    const memberIds = group.members.map((m: { userId: string }) => m.userId);

    const memberStats: MemberStat[] = await Promise.all(
      memberIds.map(async (userId: string) => {
        const [
          completedLessons,
          totalEnrollments,
          gameProfile,
          badgeCount,
          quizAttempts,
        ] = await Promise.all([
          prisma.lessonProgress.count({ where: { userId, completed: true } }),
          prisma.enrollment.count({ where: { userId } }),
          prisma.userGameProfile.findUnique({ where: { userId } }),
          prisma.userBadge.count({ where: { userId } }),
          prisma.quizAttempt.count({ where: { userId, passed: true } }),
        ]);

        const member = group.members.find((m: { userId: string }) => m.userId === userId);
        return {
          user: member?.user,
          completedLessons,
          totalEnrollments,
          xp: gameProfile?.xp || 0,
          level: gameProfile?.level || 1,
          streak: gameProfile?.streak || 0,
          badges: badgeCount,
          quizzesPassed: quizAttempts,
        };
      })
    );

    const totalLessons = memberStats.reduce((s: number, m: MemberStat) => s + m.completedLessons, 0);
    const totalXp = memberStats.reduce((s: number, m: MemberStat) => s + m.xp, 0);
    const totalBadges = memberStats.reduce((s: number, m: MemberStat) => s + m.badges, 0);
    const totalQuizzes = memberStats.reduce((s: number, m: MemberStat) => s + m.quizzesPassed, 0);
    const avgLevel = memberStats.length
      ? +(memberStats.reduce((s: number, m: MemberStat) => s + m.level, 0) / memberStats.length).toFixed(1)
      : 1;

    return NextResponse.json({
      groupXp: group.groupXp,
      aggregate: { totalLessons, totalXp, totalBadges, totalQuizzes, avgLevel },
      members: memberStats.sort((a: MemberStat, b: MemberStat) => b.xp - a.xp),
    });
  } catch (err) {
    console.error("[GET /api/community/groups/[id]/progress]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
