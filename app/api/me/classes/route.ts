/**
 * GET /api/me/classes — the signed-in student's enrolled + pending classes.
 * Used by the dashboard to render instantly and fetch data client-side.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const enrollments = await prisma.classEnrollment.findMany({
    where: {
      userId: session.userId,
      status: { in: ["APPROVED", "PENDING", "WAITLISTED"] },
    },
    include: {
      class: {
        include: {
          instructor: { select: { id: true, name: true, avatar: true } },
          _count: { select: { courses: true, enrollments: { where: { status: "APPROVED" } } } },
        },
      },
    },
    orderBy: { requestedAt: "desc" },
  });

  const items = enrollments.map((e) => ({
    id: e.id,
    status: e.status,
    progressPct: e.progressPct,
    name: e.class.name,
    slug: e.class.slug,
    thumbnail: e.class.thumbnail,
    instructorName: e.class.instructor.name,
    courses: e.class._count.courses,
    students: e.class._count.enrollments,
  }));

  return NextResponse.json({ items });
}
