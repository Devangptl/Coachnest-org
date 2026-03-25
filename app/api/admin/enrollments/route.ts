/**
 * GET /api/admin/enrollments — List all enrollments with filters
 */
import { getSession } from "@/lib/auth";
import { getEnrollmentsList } from "@/services/enrollment.service";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const url = new URL(req.url);
    const courseId = url.searchParams.get("courseId") || undefined;
    const status = (url.searchParams.get("status") as any) || undefined;
    const dateFrom = url.searchParams.get("dateFrom") || undefined;
    const dateTo = url.searchParams.get("dateTo") || undefined;
    const search = url.searchParams.get("search") || undefined;

    const enrollments = await getEnrollmentsList({
      courseId,
      status,
      dateFrom,
      dateTo,
      search,
    });

    return NextResponse.json({ data: enrollments }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/admin/enrollments]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
