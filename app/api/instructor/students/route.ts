/**
 * GET /api/instructor/students — students enrolled in instructor's courses
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "INSTRUCTOR" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // All enrollments for courses owned by this instructor
  const enrollments = await prisma.enrollment.findMany({
    where: { course: { createdById: session.userId } },
    include: {
      user:   { select: { id: true, name: true, email: true, avatar: true, createdAt: true } },
      course: { select: { id: true, title: true, thumbnail: true } },
    },
    orderBy: { course: { createdAt: "desc" } },
  });

  return NextResponse.json({ enrollments });
}
