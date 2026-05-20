/**
 * GET /api/student/analytics
 * Returns analytics data for the currently authenticated student.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStudentAnalytics } from "@/services/analytics.service";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await getStudentAnalytics(session.userId);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/student/analytics]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
