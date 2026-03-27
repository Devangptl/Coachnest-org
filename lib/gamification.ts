import { prisma } from "@/lib/prisma";
import { getLevelForXp, BADGE_MAP } from "@/lib/badges";

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
  meta?: Record<string, unknown>
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
      data: { userId, action, xp: xpAmount, meta: meta ?? null },
    }),
  ]);

  // Check level-based badges
  if (leveledUp) {
    if (newLevel >= 2) await grantBadge(userId, "level_2");
    if (newLevel >= 5) await grantBadge(userId, "level_5");
  }

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

export async function updateStreak(userId: string) {
  const profile = await getOrCreateProfile(userId);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (profile.lastActiveDate) {
    const last = new Date(profile.lastActiveDate);
    const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
    const diffDays = Math.round((today.getTime() - lastDay.getTime()) / 86400000);

    if (diffDays === 0) return profile; // already logged today
    if (diffDays === 1) {
      // Consecutive day
      const newStreak = profile.streak + 1;
      const longestStreak = Math.max(newStreak, profile.longestStreak);
      await prisma.userGameProfile.update({
        where: { userId },
        data: { streak: newStreak, longestStreak, lastActiveDate: now },
      });
      // Award streak XP
      const streakXp = XP_VALUES.DAILY_STREAK_BASE + newStreak * 2;
      await awardXp(userId, "DAILY_STREAK", streakXp, { streak: newStreak });
      // Check streak badges
      if (newStreak >= 3)  await grantBadge(userId, "streak_3");
      if (newStreak >= 7)  await grantBadge(userId, "streak_7");
      if (newStreak >= 30) await grantBadge(userId, "streak_30");
    } else {
      // Streak broken
      await prisma.userGameProfile.update({
        where: { userId },
        data: { streak: 1, lastActiveDate: now },
      });
    }
  } else {
    // First time
    await prisma.userGameProfile.update({
      where: { userId },
      data: { streak: 1, longestStreak: 1, lastActiveDate: now },
    });
  }

  return prisma.userGameProfile.findUnique({ where: { userId } });
}
