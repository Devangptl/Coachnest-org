/**
 * GET /api/lessons/[id]/quiz
 * Fetch quiz data for a lesson (questions with options, no correct answers exposed).
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
    });
  } catch (err) {
    console.error("[GET /api/lessons/[id]/quiz]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
