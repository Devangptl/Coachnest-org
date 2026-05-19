/**
 * GET /api/admin/quizzes — List all quizzes
 * POST /api/admin/quizzes — Create new quiz
 */
import { getSession } from "@/lib/auth";
import { getQuizzesList, createQuiz } from "@/services/quiz.service";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const url = new URL(req.url);
    const page = Number(url.searchParams.get("page")) || undefined;
    const pageSize = Number(url.searchParams.get("pageSize")) || undefined;

    const result = await getQuizzesList({ page, pageSize });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[GET /api/admin/quizzes]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const body = await req.json();
    const { lessonId, title, passMark, timeLimit, questions } = body;

    if (!lessonId || !title || passMark === undefined) {
      return NextResponse.json(
        { error: "lessonId, title, and passMark are required." },
        { status: 400 }
      );
    }

    const quiz = await createQuiz({
      lessonId,
      title,
      passMark,
      timeLimit,
      questions: questions || [],
    });

    return NextResponse.json({ data: quiz }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/quizzes]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
