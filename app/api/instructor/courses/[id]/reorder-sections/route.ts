/**
 * PATCH /api/instructor/courses/[id]/reorder-sections
 * Body: { order: Array<{ id: string; order: number }> }
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || (session.role !== "INSTRUCTOR" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: courseId } = await params;

  const course = await prisma.course.findFirst({
    where:
      session.role === "ADMIN"
        ? { id: courseId }
        : { id: courseId, createdById: session.userId },
    select: { id: true },
  });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  let body: { order?: { id: string; order: number }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const items = body.order;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "order array is required" }, { status: 400 });
  }

  await prisma.$transaction(
    items.map(({ id, order }) =>
      prisma.section.updateMany({
        where: { id, courseId },
        data: { order },
      })
    )
  );

  revalidateTag("course-lessons");

  return NextResponse.json({ ok: true });
}
