/**
 * GET /api/admin/quizzes/[id] — Get quiz details
 * PATCH /api/admin/quizzes/[id] — Update quiz
 * DELETE /api/admin/quizzes/[id] — Delete quiz
 */
import { getSession } from "@/lib/auth";
import { getQuizDetails, updateQuiz, deleteQuiz } from "@/services/quiz.service";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    const quiz = await getQuizDetails(id);
    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
    }

    return NextResponse.json({ data: quiz }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/admin/quizzes/[id]]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, passMark, timeLimit } = body;

    const update: any = {};
    if (title !== undefined) update.title = title;
    if (passMark !== undefined) update.passMark = passMark;
    if (timeLimit !== undefined) update.timeLimit = timeLimit;

    const quiz = await updateQuiz(id, update);
    return NextResponse.json({ data: quiz }, { status: 200 });
  } catch (error) {
    console.error("[PATCH /api/admin/quizzes/[id]]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    await deleteQuiz(id);
    return NextResponse.json({ message: "Quiz deleted." }, { status: 200 });
  } catch (error) {
    console.error("[DELETE /api/admin/quizzes/[id]]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
