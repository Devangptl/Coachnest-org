import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateStreak } from "@/lib/gamification";
import { BADGES, getLevelForXp, xpToNextLevel } from "@/lib/badges";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Update streak on each profile fetch (acts as a daily login ping)
    await updateStreak(session.userId);

    const [profile, earnedBadges] = await Promise.all([
      prisma.userGameProfile.findUnique({ where: { userId: session.userId } }),
      prisma.userBadge.findMany({
        where: { userId: session.userId },
        select: { badgeKey: true, earnedAt: true },
      }),
    ]);

    const xp = profile?.xp ?? 0;
    const level = getLevelForXp(xp);
    const nextLevelProgress = xpToNextLevel(xp);
    const earnedKeys = new Set(earnedBadges.map((b) => b.badgeKey));

    const badges = BADGES.map((b) => ({
      ...b,
      earned: earnedKeys.has(b.key),
      earnedAt: earnedBadges.find((e) => e.badgeKey === b.key)?.earnedAt ?? null,
    }));

    return NextResponse.json({
      xp,
      level: level.level,
      levelLabel: level.label,
      levelColor: level.color,
      streak: profile?.streak ?? 0,
      longestStreak: profile?.longestStreak ?? 0,
      nextLevelProgress,
      badges,
      earnedCount: earnedKeys.size,
    });
  } catch (err) {
    console.error("[GET /api/gamification/profile]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
