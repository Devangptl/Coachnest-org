/**
 * GET /api/admin/students — List all students with stats, search, and filters.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStudentsList, type StudentListFilter } from "@/services/student.service";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "INSTRUCTOR")) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const filter: StudentListFilter = {
      search: searchParams.get("search")?.trim() || "",
      sort: (searchParams.get("sort") as StudentListFilter["sort"]) || "newest",
      page: Number(searchParams.get("page")) || undefined,
      pageSize: Number(searchParams.get("pageSize")) || undefined,
    };

    const result = await getStudentsList(filter);

    return NextResponse.json({
      students: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/students]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
