/**
 * GET /api/admin/students/[id]/profile — Get student profile with enrollments
 */
import { getSession } from "@/lib/auth";
import { getStudentEnrollments } from "@/services/enrollment.service";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    const data = await getStudentEnrollments(id);

    if (!data) {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/admin/students/[id]/profile]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
