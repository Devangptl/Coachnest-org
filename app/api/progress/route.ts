/**
 * POST /api/progress  — mark a lesson as complete/incomplete for the current user
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { awardXp, checkLessonBadges } from "@/lib/gamification";
import { XP_VALUES } from "@/lib/gamification";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { lessonId, completed } = await req.json();
    if (!lessonId) {
      return NextResponse.json({ error: "lessonId is required." }, { status: 400 });
    }

    // Check if this lesson was already completed (to avoid duplicate XP)
    const existing = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: session.userId, lessonId } },
    });
    const wasAlreadyCompleted = existing?.completed ?? false;

    const progress = await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: { userId: session.userId, lessonId },
      },
      update: {
        completed: Boolean(completed),
        completedAt: completed ? new Date() : null,
      },
      create: {
        userId: session.userId,
        lessonId,
        completed: Boolean(completed),
        completedAt: completed ? new Date() : null,
      },
    });

    // Award XP only on first-time completion
    let xpGained = 0;
    if (completed && !wasAlreadyCompleted) {
      await awardXp(session.userId, "LESSON_COMPLETE", XP_VALUES.LESSON_COMPLETE, { lessonId });
      xpGained = XP_VALUES.LESSON_COMPLETE;
      await checkLessonBadges(session.userId);
    }

    return NextResponse.json({ progress, xpGained });
  } catch (error) {
    console.error("[POST /api/progress]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
