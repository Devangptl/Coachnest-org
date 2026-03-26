/**
 * GET /api/admin/students — List all students with stats, search, and filters.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "INSTRUCTOR")) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const sort = searchParams.get("sort") || "newest";

    const where: any = { role: "STUDENT" as const };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const orderBy: any =
      sort === "name" ? { name: "asc" } :
      sort === "oldest" ? { createdAt: "asc" } :
      { createdAt: "desc" };

    const students = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        headline: true,
        createdAt: true,
        _count: {
          select: {
            enrollments: true,
            certificates: true,
            orders: true,
            reviews: true,
          },
        },
      },
      orderBy,
    });

    return NextResponse.json({ students });
  } catch (error) {
    console.error("[GET /api/admin/students]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
