import { prisma } from "@/lib/prisma";
import { getLevelForXp, BADGE_MAP } from "@/lib/badges";
import { emit } from "@/lib/realtime/emit";
import { channels, events } from "@/lib/realtime/channels";

// ── XP values per action ──────────────────────────────────────────────────────

export const XP_VALUES = {
  LESSON_COMPLETE: 50,
  QUIZ_PASS: 100,
  QUIZ_PERFECT_BONUS: 50, // added on top of QUIZ_PASS when score === 100
  DAILY_STREAK_BASE: 10,
} as const;

type XpAction = keyof typeof XP_VALUES | "BADGE_REWARD" | "DAILY_STREAK";

// ── Core: get or create game profile ─────────────────────────────────────────

async function getOrCreateProfile(userId: string) {
  const existing = await prisma.userGameProfile.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.userGameProfile.create({ data: { userId } });
}

// ── Award XP ─────────────────────────────────────────────────────────────────

export async function awardXp(
  userId: string,
  action: string,
  xpAmount: number,
  meta?: any
) {
  const profile = await getOrCreateProfile(userId);
  const newXp = profile.xp + xpAmount;
  const newLevel = getLevelForXp(newXp).level;
  const leveledUp = newLevel > profile.level;

  await Promise.all([
    prisma.userGameProfile.update({
      where: { userId },
      data: { xp: newXp, level: newLevel },
    }),
    prisma.xpEvent.create({
      data: { userId, action, xp: xpAmount, meta: meta || undefined },
    }),
  ]);

  // Check level-based badges
  if (leveledUp) {
    if (newLevel >= 2) await grantBadge(userId, "level_2");
    if (newLevel >= 5) await grantBadge(userId, "level_5");
  }

  await emit(channels.leaderboard(), events.leaderboardChanged, {
    userId, xp: newXp, level: newLevel, leveledUp,
  });

  return { xp: newXp, level: newLevel, leveledUp };
}

// ── Grant a badge (idempotent) ────────────────────────────────────────────────

export async function grantBadge(userId: string, badgeKey: string) {
  const already = await prisma.userBadge.findUnique({
    where: { userId_badgeKey: { userId, badgeKey } },
  });
  if (already) return null;

  await prisma.userBadge.create({ data: { userId, badgeKey } });

  // Award XP reward for the badge
  const def = BADGE_MAP[badgeKey];
  if (def && def.xpReward > 0) {
    await awardXp(userId, "BADGE_REWARD", def.xpReward, { badgeKey });
  }

  return badgeKey;
}

// ── Check and award lesson-related badges ────────────────────────────────────

export async function checkLessonBadges(userId: string) {
  const count = await prisma.lessonProgress.count({
    where: { userId, completed: true },
  });

  if (count >= 1)  await grantBadge(userId, "first_lesson");
  if (count >= 5)  await grantBadge(userId, "lessons_5");
  if (count >= 25) await grantBadge(userId, "lessons_25");
  if (count >= 50) await grantBadge(userId, "lessons_50");
}

// ── Check and award quiz-related badges ──────────────────────────────────────

export async function checkQuizBadges(userId: string, score: number, passed: boolean) {
  const attempts = await prisma.quizAttempt.count({ where: { userId } });
  if (attempts >= 1) await grantBadge(userId, "quiz_first");
  if (passed)        await grantBadge(userId, "quiz_pass");
  if (score === 100) await grantBadge(userId, "quiz_perfect");
}

// ── Update daily streak ───────────────────────────────────────────────────────
// Call this from real learning events (lesson complete, quiz attempt) only —
// never from page-view routes, otherwise page visits would maintain streaks.

export async function updateStreak(userId: string) {
  const profile = await getOrCreateProfile(userId);
  const now = new Date();

  // Use UTC day boundaries so the result is the same regardless of server timezone.
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  if (profile.lastActiveDate) {
    const last = new Date(profile.lastActiveDate);
    const lastUtc = Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate());
    const diffDays = Math.round((todayUtc - lastUtc) / 86_400_000);

    if (diffDays === 0) return profile; // already active today — nothing to do

    const newStreak = diffDays === 1 ? profile.streak + 1 : 1;
    const newLongest = Math.max(newStreak, profile.longestStreak);

    // Optimistic concurrency: only commit if lastActiveDate hasn't changed
    // since we read it (prevents double-increment from concurrent requests).
    const updated = await prisma.userGameProfile.updateMany({
      where: { userId, lastActiveDate: profile.lastActiveDate },
      data: { streak: newStreak, longestStreak: newLongest, lastActiveDate: now },
    });
    if (updated.count === 0) return profile; // a concurrent call already won

    // Award XP for every active day (including day-1 restarts after a break).
    const streakXp = XP_VALUES.DAILY_STREAK_BASE + newStreak * 2;
    await awardXp(userId, "DAILY_STREAK", streakXp, { streak: newStreak });

    if (newStreak >= 3)  await grantBadge(userId, "streak_3");
    if (newStreak >= 7)  await grantBadge(userId, "streak_7");
    if (newStreak >= 30) await grantBadge(userId, "streak_30");

  } else {
    // First-ever learning activity — bootstrap the profile.
    const updated = await prisma.userGameProfile.updateMany({
      where: { userId, lastActiveDate: null },
      data: { streak: 1, longestStreak: 1, lastActiveDate: now },
    });
    if (updated.count === 0) return profile;

    const streakXp = XP_VALUES.DAILY_STREAK_BASE + 1 * 2;
    await awardXp(userId, "DAILY_STREAK", streakXp, { streak: 1 });
  }

  return prisma.userGameProfile.findUnique({ where: { userId } });
}
