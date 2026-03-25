/**
 * GET /api/admin/quizzes/[id]/attempts — Get quiz attempt results
 */
import { getSession } from "@/lib/auth";
import { getQuizAttempts } from "@/services/quiz.service";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    const url = new URL(req.url);
    const studentId = url.searchParams.get("studentId") || undefined;
    const dateFrom = url.searchParams.get("dateFrom") || undefined;
    const dateTo = url.searchParams.get("dateTo") || undefined;

    const attempts = await getQuizAttempts(id, { studentId, dateFrom, dateTo });
    return NextResponse.json({ data: attempts }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/admin/quizzes/[id]/attempts]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
