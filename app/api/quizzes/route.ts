/**
 * GET  /api/quizzes?lessonId=  — get quiz for a lesson
 * POST /api/quizzes            — create a quiz (instructor/admin)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { authorizeCourseEdit } from "@/services/collaboration.service";

export async function GET(req: NextRequest) {
  try {
    const lessonId = req.nextUrl.searchParams.get("lessonId");
    if (!lessonId) return NextResponse.json({ error: "lessonId required" }, { status: 400 });

    const quiz = await prisma.quiz.findUnique({
      where:   { lessonId },
      include: { questions: { orderBy: { order: "asc" } } },
    });

    if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

    // Strip isCorrect from options before sending to student
    const session = await getSession();
    const isAuthor = session && (session.role === "ADMIN" || session.role === "INSTRUCTOR");

    const sanitised = {
      ...quiz,
      questions: quiz.questions.map((q) => ({
        ...q,
        options: isAuthor
          ? q.options
          : (q.options as Array<{ id: string; text: string; isCorrect: boolean }>)
              .map(({ id, text }) => ({ id, text })),
      })),
    };

    return NextResponse.json({ quiz: sanitised });
  } catch (err) {
    console.error("[GET /api/quizzes]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { lessonId, title, passMark, timeLimit, questions } = await req.json();
    if (!lessonId || !title || !questions?.length) {
      return NextResponse.json({ error: "lessonId, title, and questions are required" }, { status: 400 });
    }

    // Check edit permission on the parent course.
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { courseId: true },
    });
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
    }
    if (!(await authorizeCourseEdit(session, lesson.courseId))) {
      return NextResponse.json(
        { error: "You don't have permission to edit this course." },
        { status: 403 },
      );
    }

    const quiz = await prisma.quiz.create({
      data: {
        lessonId,
        title,
        passMark: passMark ?? 70,
        timeLimit,
        questions: {
          create: questions.map((q: { text: string; options: unknown; order: number; points?: number }, i: number) => ({
            text:    q.text,
            options: q.options,
            order:   q.order ?? i + 1,
            points:  q.points ?? 1,
          })),
        },
      },
      include: { questions: true },
    });

    return NextResponse.json({ quiz }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/quizzes]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
