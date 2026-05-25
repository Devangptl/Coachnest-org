/**
 * POST /api/quizzes/[id]/attempt
 * Submit a quiz attempt and get the score.
 * Body: { answers: { [questionId]: optionId }, timeTaken?: number }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { awardXp, checkQuizBadges, updateStreak } from "@/lib/gamification";
import { XP_VALUES } from "@/lib/gamification";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: quizId } = await params;
    const { answers, timeTaken } = await req.json();

    const quiz = await prisma.quiz.findUnique({
      where:   { id: quizId },
      include: { questions: true },
    });
    if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

    // Grade the attempt
    let earned = 0;
    let total  = 0;
    for (const q of quiz.questions) {
      total += q.points;
      const opts = q.options as Array<{ id: string; text: string; isCorrect: boolean }>;
      const correct = opts.find((o) => o.isCorrect);
      if (correct && answers[q.id] === correct.id) {
        earned += q.points;
      }
    }

    const score  = total === 0 ? 0 : Math.round((earned / total) * 100);
    const passed = score >= quiz.passMark;

    const attempt = await prisma.quizAttempt.create({
      data: {
        userId:    session.userId,
        quizId,
        score,
        passed,
        answers,
        timeTaken: timeTaken ?? null,
      },
    });

    await updateStreak(session.userId);

    // Award XP for quiz
    let xpGained = 0;
    if (passed) {
      xpGained += XP_VALUES.QUIZ_PASS;
      if (score === 100) xpGained += XP_VALUES.QUIZ_PERFECT_BONUS;
      await awardXp(session.userId, "QUIZ_PASS", xpGained, { quizId, score });
    }
    await checkQuizBadges(session.userId, score, passed);

    // Build per-question feedback
    const feedback = quiz.questions.map((q) => {
      const opts    = q.options as Array<{ id: string; text: string; isCorrect: boolean }>;
      const correct = opts.find((o) => o.isCorrect);
      return {
        questionId:      q.id,
        questionText:    q.text,
        selectedOption:  answers[q.id] ?? null,
        correctOption:   correct?.id ?? null,
        isCorrect:       answers[q.id] === correct?.id,
        options:         opts,
      };
    });

    return NextResponse.json({ attempt, score, passed, passMark: quiz.passMark, feedback, xpGained });
  } catch (err) {
    console.error("[POST /api/quizzes/[id]/attempt]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
