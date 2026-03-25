/**
 * GET /api/lessons/[id]/quiz
 * Fetch quiz data for a lesson (questions with options, no correct answers exposed).
 * Also returns the user's previous attempts for this quiz.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: lessonId } = await params;

    const quiz = await prisma.quiz.findUnique({
      where: { lessonId },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!quiz) return NextResponse.json({ error: "No quiz for this lesson" }, { status: 404 });

    // Fetch user's previous attempts
    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId: quiz.id, userId: session.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        score: true,
        passed: true,
        timeTaken: true,
        createdAt: true,
      },
    });

    // Strip correct answers from options before sending to client
    const questions = quiz.questions.map((q) => {
      const opts = q.options as Array<{ id: string; text: string; isCorrect: boolean }>;
      return {
        id: q.id,
        text: q.text,
        points: q.points,
        options: opts.map(({ id, text }) => ({ id, text })),
      };
    });

    return NextResponse.json({
      id: quiz.id,
      title: quiz.title,
      passMark: quiz.passMark,
      timeLimit: quiz.timeLimit,
      questions,
      previousAttempts: attempts,
      bestScore: attempts.length > 0 ? Math.max(...attempts.map((a) => a.score)) : null,
      hasPassed: attempts.some((a) => a.passed),
    });
  } catch (err) {
    console.error("[GET /api/lessons/[id]/quiz]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
