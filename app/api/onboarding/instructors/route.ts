/**
 * GET /api/onboarding/instructors?q=...
 *
 * Returns instructors for the onboarding "follow an instructor" step.
 * - No query → top 5 popular instructors (by total student enrollments)
 * - q=...    → up to 10 results matching name or headline (case-insensitive)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  try {
    const raw = await prisma.user.findMany({
      where: {
        role: "INSTRUCTOR",
        ...(q && {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { headline: { contains: q, mode: "insensitive" } },
          ],
        }),
      },
      select: {
        id:       true,
        name:     true,
        avatar:   true,
        headline: true,
        courses: {
          where:  { status: "PUBLISHED" },
          select: { _count: { select: { enrollments: true } } },
        },
        _count: {
          select: { courses: { where: { status: "PUBLISHED" } } },
        },
      },
      take: q ? 10 : 20,
    });

    const instructors = raw
      .map((i) => ({
        id:           i.id,
        name:         i.name,
        avatar:       i.avatar,
        headline:     i.headline,
        courseCount:  i._count.courses,
        studentCount: i.courses.reduce((sum, c) => sum + c._count.enrollments, 0),
      }))
      .sort((a, b) => (q ? 0 : b.studentCount - a.studentCount))
      .slice(0, q ? 10 : 5);

    return NextResponse.json({ instructors });
  } catch (error) {
    console.error("[GET /api/onboarding/instructors]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
