/**
 * GET /api/classes/:id/manage — full class data for the instructor dashboard.
 * Owner or admin only. Lets the management page render a shell instantly and
 * fetch its data client-side.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cls = await prisma.class.findUnique({
    where: { id },
    include: {
      instructor: { select: { id: true, name: true, avatar: true } },
      courses: {
        orderBy: { order: "asc" },
        include: {
          course: { select: { id: true, title: true, slug: true, thumbnail: true, totalLessons: true } },
        },
      },
      _count: {
        select: {
          enrollments: { where: { status: "APPROVED" } },
          liveSessions: true,
        },
      },
    },
  });

  if (!cls) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (cls.instructorId !== session.userId && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ class: cls });
}
