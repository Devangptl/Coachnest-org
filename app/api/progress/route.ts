/**
 * GET  /api/progress?lessonId=…   — fetch the current user's saved progress for a lesson
 * POST /api/progress              — update a lesson's completion / watched-seconds
 *
 * POST body:
 *   { lessonId: string,
 *     completed?: boolean,        // omit to preserve existing completion state
 *     watchedSecs?: number }      // only applied if greater than the stored value
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { awardXp, checkLessonBadges, updateStreak } from "@/lib/gamification";
import { XP_VALUES } from "@/lib/gamification";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const lessonId = req.nextUrl.searchParams.get("lessonId");
  if (!lessonId) {
    return NextResponse.json({ error: "lessonId is required." }, { status: 400 });
  }

  const row = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId: session.userId, lessonId } },
    select: { watchedSecs: true, completed: true },
  });

  return NextResponse.json({
    watchedSecs: row?.watchedSecs ?? 0,
    completed:   row?.completed   ?? false,
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // sendBeacon posts as text/plain or a Blob, so accept both.
    const raw = await req.text();
    const { lessonId, completed, watchedSecs } = raw ? JSON.parse(raw) : {};
    if (!lessonId) {
      return NextResponse.json({ error: "lessonId is required." }, { status: 400 });
    }

    const existing = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: session.userId, lessonId } },
    });
    const wasAlreadyCompleted = existing?.completed ?? false;

    // Only bump watchedSecs forward — never overwrite with a smaller value.
    const incoming = typeof watchedSecs === "number" && watchedSecs > 0
      ? Math.round(watchedSecs)
      : null;
    const watchedSecsUpdate = incoming !== null && incoming > (existing?.watchedSecs ?? 0)
      ? { watchedSecs: incoming }
      : {};

    // Preserve existing completion state when `completed` isn't explicitly passed.
    const completionUpdate = typeof completed === "boolean"
      ? { completed, completedAt: completed ? new Date() : null }
      : {};

    const progress = await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: session.userId, lessonId } },
      update: { ...completionUpdate, ...watchedSecsUpdate },
      create: {
        userId:      session.userId,
        lessonId,
        completed:   completed === true,
        completedAt: completed === true ? new Date() : null,
        ...watchedSecsUpdate,
      },
    });

    let xpGained = 0;
    if (completed === true && !wasAlreadyCompleted) {
      await awardXp(session.userId, "LESSON_COMPLETE", XP_VALUES.LESSON_COMPLETE, { lessonId });
      xpGained = XP_VALUES.LESSON_COMPLETE;
      await checkLessonBadges(session.userId);
      await updateStreak(session.userId);
    }

    return NextResponse.json({ progress, xpGained });
  } catch (error) {
    console.error("[POST /api/progress]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
