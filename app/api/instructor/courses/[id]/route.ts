/**
 * GET    /api/instructor/courses/:id  — fetch own course with lessons
 * PATCH  /api/instructor/courses/:id  — update own course
 * DELETE /api/instructor/courses/:id  — delete own course
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

async function getOwnCourse(courseId: string, userId: string) {
  return prisma.course.findFirst({
    where: { id: courseId, createdById: userId },
    include: { lessons: { orderBy: { order: "asc" } } },
  });
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || (session.role !== "INSTRUCTOR" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const course = await getOwnCourse(id, session.userId);
  if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });

  return NextResponse.json({ course });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || (session.role !== "INSTRUCTOR" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.course.findFirst({ where: { id, createdById: session.userId } });
  if (!existing) return NextResponse.json({ error: "Course not found." }, { status: 404 });

  const data = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};

  if (data.title       !== undefined) update.title       = data.title;
  if (data.description !== undefined) update.description = data.description;
  if (data.thumbnail   !== undefined) update.thumbnail   = data.thumbnail || null;
  if (data.level       !== undefined) update.level       = data.level;
  if (data.isFree      !== undefined) update.isFree      = data.isFree;
  if (data.price       !== undefined) update.price       = data.isFree ? null : data.price ? parseFloat(data.price) : null;
  if (data.status      !== undefined) update.status      = data.status;

  const course = await prisma.course.update({ where: { id }, data: update });
  return NextResponse.json({ course });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || (session.role !== "INSTRUCTOR" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.course.findFirst({ where: { id, createdById: session.userId } });
  if (!existing) return NextResponse.json({ error: "Course not found." }, { status: 404 });

  await prisma.course.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
