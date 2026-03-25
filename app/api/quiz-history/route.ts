/**
 * GET /api/quiz-history
 * Fetch the current user's quiz attempt history with quiz and course details.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const attempts = await prisma.quizAttempt.findMany({
      where: { userId: session.userId },
      include: {
        quiz: {
          include: {
            lesson: {
              select: {
                id: true,
                title: true,
                course: { select: { id: true, title: true, thumbnail: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group by quiz, show best attempt and attempt count
    const quizMap = new Map<string, {
      quizId: string;
      quizTitle: string;
      lessonTitle: string;
      courseId: string;
      courseTitle: string;
      courseThumbnail: string | null;
      passMark: number;
      attempts: Array<{
        id: string;
        score: number;
        passed: boolean;
        timeTaken: number | null;
        createdAt: Date;
      }>;
    }>();

    for (const a of attempts) {
      if (!quizMap.has(a.quizId)) {
        quizMap.set(a.quizId, {
          quizId: a.quizId,
          quizTitle: a.quiz.title,
          lessonTitle: a.quiz.lesson.title,
          courseId: a.quiz.lesson.course.id,
          courseTitle: a.quiz.lesson.course.title,
          courseThumbnail: a.quiz.lesson.course.thumbnail,
          passMark: a.quiz.passMark,
          attempts: [],
        });
      }
      quizMap.get(a.quizId)!.attempts.push({
        id: a.id,
        score: a.score,
        passed: a.passed,
        timeTaken: a.timeTaken,
        createdAt: a.createdAt,
      });
    }

    const data = Array.from(quizMap.values()).map((q) => ({
      ...q,
      attemptCount: q.attempts.length,
      bestScore: Math.max(...q.attempts.map((a) => a.score)),
      hasPassed: q.attempts.some((a) => a.passed),
      lastAttempt: q.attempts[0],
    }));

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[GET /api/quiz-history]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
