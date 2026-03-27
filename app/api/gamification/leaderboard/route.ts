import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLevelForXp } from "@/lib/badges";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [topProfiles, currentUserProfile] = await Promise.all([
      prisma.userGameProfile.findMany({
        take: 10,
        orderBy: { xp: "desc" },
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
      }),
      prisma.userGameProfile.findUnique({ where: { userId: session.userId } }),
    ]);

    const leaderboard = topProfiles.map((p, idx) => ({
      rank: idx + 1,
      userId: p.userId,
      name: p.user.name,
      avatar: p.user.avatar,
      xp: p.xp,
      level: p.level,
      levelLabel: getLevelForXp(p.xp).label,
      streak: p.streak,
      isCurrentUser: p.userId === session.userId,
    }));

    // Find current user's rank if not in top 10
    let currentUserRank: number | null = null;
    if (currentUserProfile && !leaderboard.find((e) => e.isCurrentUser)) {
      currentUserRank = await prisma.userGameProfile.count({
        where: { xp: { gt: currentUserProfile.xp } },
      }) + 1;
    }

    return NextResponse.json({ leaderboard, currentUserRank });
  } catch (err) {
    console.error("[GET /api/gamification/leaderboard]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
