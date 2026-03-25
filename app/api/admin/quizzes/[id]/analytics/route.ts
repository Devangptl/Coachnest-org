/**
 * GET /api/admin/quizzes/[id]/analytics — Get quiz performance analytics
 */
import { getSession } from "@/lib/auth";
import { getQuizAnalytics } from "@/services/quiz.service";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    const analytics = await getQuizAnalytics(id);
    return NextResponse.json({ data: analytics }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/admin/quizzes/[id]/analytics]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
