/**
 * GET /api/admin/lessons/[id]/quiz
 * Fetch quiz data for a lesson (admin — includes correct answers).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getQuizByLessonId } from "@/services/quiz.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id: lessonId } = await params;
    const quiz = await getQuizByLessonId(lessonId);

    if (!quiz) {
      return NextResponse.json({ error: "No quiz for this lesson" }, { status: 404 });
    }

    return NextResponse.json({ data: quiz });
  } catch (err) {
    console.error("[GET /api/admin/lessons/[id]/quiz]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
