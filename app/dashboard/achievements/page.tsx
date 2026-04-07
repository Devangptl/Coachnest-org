/**
 * Achievements page — XP, streak, badges, and leaderboard
 * Server Component: fetches gamification data directly from DB
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateStreak } from "@/lib/gamification";
import { BADGES, getLevelForXp, xpToNextLevel } from "@/lib/badges";
import GlassCard from "@/components/GlassCard";
import XpProgressBar from "@/components/XpProgressBar";
import StreakCounter from "@/components/StreakCounter";
import { Trophy, Medal, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

async function getAchievementsData(userId: string) {
  await updateStreak(userId);

  const [profile, earnedBadges, leaderboard] = await Promise.all([
    prisma.userGameProfile.findUnique({ where: { userId } }),
    prisma.userBadge.findMany({
      where: { userId },
      select: { badgeKey: true, earnedAt: true },
    }),
    prisma.userGameProfile.findMany({
      take: 10,
      orderBy: { xp: "desc" },
      include: { user: { select: { id: true, name: true } } },
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

  return {
    xp,
    level: level.level,
    levelLabel: level.label,
    levelColor: level.color,
    streak: profile?.streak ?? 0,
    longestStreak: profile?.longestStreak ?? 0,
    nextLevelProgress,
    badges,
    earnedCount: earnedKeys.size,
    leaderboard: leaderboard.map((p, idx) => ({
      rank: idx + 1,
      userId: p.userId,
      name: p.user.name,
      xp: p.xp,
      level: p.level,
      levelLabel: getLevelForXp(p.xp).label,
      streak: p.streak,
      isCurrentUser: p.userId === userId,
    })),
  };
}

export default async function AchievementsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const data = await getAchievementsData(session.userId);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Trophy className="w-7 h-7 text-orange-400" />
          Achievements
        </h1>
        <p className="text-muted-foreground mt-1">
          Track your XP, streaks, and earned badges.
        </p>
      </div>

      {/* XP + Streak row */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <XpProgressBar
          xp={data.xp}
          level={data.level}
          levelLabel={data.levelLabel}
          levelColor={data.levelColor}
          nextLevelProgress={data.nextLevelProgress}
        />
        <StreakCounter streak={data.streak} longestStreak={data.longestStreak} />
      </div>

      {/* Badges */}
      <GlassCard className="mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Medal className="w-5 h-5 text-orange-400" />
            Badges
          </h2>
          <span className="text-sm text-muted-foreground">
            {data.earnedCount} / {BADGES.length} earned
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {data.badges.map((badge) => (
            <div
              key={badge.key}
              className={cn(
                "rounded-md border p-4 flex flex-col items-center text-center gap-2 transition-all",
                badge.earned
                  ? "bg-orange-500/5 border-orange-500/20"
                  : "bg-secondary/30 border-border opacity-50"
              )}
            >
              <span className={cn("text-3xl", !badge.earned && "grayscale")}>{badge.icon}</span>
              <div>
                <p className={cn("text-sm font-semibold", badge.earned ? "text-foreground" : "text-muted-foreground")}>
                  {badge.name}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  {badge.description}
                </p>
              </div>
              {badge.earned && badge.earnedAt && (
                <span className="text-[10px] text-orange-400/70">
                  {new Date(badge.earnedAt).toLocaleDateString()}
                </span>
              )}
              {!badge.earned && badge.xpReward > 0 && (
                <span className="text-[10px] text-muted-foreground/50">
                  +{badge.xpReward} XP reward
                </span>
              )}
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Leaderboard */}
      <GlassCard>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-5">
          <Zap className="w-5 h-5 text-yellow-400" />
          Leaderboard
        </h2>

        {data.leaderboard.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            No learners yet. Be the first to earn XP!
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.leaderboard.map((entry) => (
              <div
                key={entry.userId}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-md border transition-colors",
                  entry.isCurrentUser
                    ? "bg-orange-500/8 border-orange-500/20"
                    : "bg-secondary/30 border-border"
                )}
              >
                {/* Rank */}
                <span className={cn(
                  "w-7 text-center font-bold text-sm flex-shrink-0",
                  entry.rank === 1 ? "text-yellow-400" :
                  entry.rank === 2 ? "text-slate-300" :
                  entry.rank === 3 ? "text-orange-600" :
                  "text-muted-foreground"
                )}>
                  {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                </span>

                {/* Name + level */}
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium truncate", entry.isCurrentUser ? "text-orange-500" : "text-foreground")}>
                    {entry.name} {entry.isCurrentUser && <span className="text-xs text-muted-foreground">(you)</span>}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Lv.{entry.level} {entry.levelLabel}
                  </p>
                </div>

                {/* Streak */}
                {entry.streak > 0 && (
                  <span className="text-xs text-orange-400 flex items-center gap-1">
                    🔥 {entry.streak}
                  </span>
                )}

                {/* XP */}
                <span className="text-sm font-bold text-foreground">
                  {entry.xp.toLocaleString()} <span className="text-xs text-muted-foreground font-normal">XP</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
