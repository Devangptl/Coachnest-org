/**
 * PATCH  /api/lessons/:id  — update a lesson (admin only)
 * DELETE /api/lessons/:id  — delete a lesson (admin only)
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { authorizeCourseEdit } from "@/services/collaboration.service";

type Params = { params: Promise<{ id: string }> };

async function getLessonCourseId(id: string): Promise<string | null> {
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    select: { courseId: true },
  });
  return lesson?.courseId ?? null;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    const courseId = await getLessonCourseId(id);
    if (!courseId) {
      return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
    }
    if (!(await authorizeCourseEdit(session, courseId))) {
      return NextResponse.json(
        { error: "You don't have permission to edit this course." },
        { status: 403 },
      );
    }

    const data = await req.json();

    const lesson = await prisma.lesson.update({
      where: { id },
      data: {
        title: data.title,
        type: data.type,
        content: data.content,
        description: data.description,
        order: data.order,
        duration: data.duration,
        isFree: data.isFree,
        ...(data.sectionId !== undefined && { sectionId: data.sectionId }),
      },
    });

    revalidateTag("course-lessons", "max");

    return NextResponse.json({ lesson });
  } catch (error) {
    console.error("[PATCH /api/lessons/:id]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    const courseId = await getLessonCourseId(id);
    if (!courseId) {
      return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
    }
    if (!(await authorizeCourseEdit(session, courseId))) {
      return NextResponse.json(
        { error: "You don't have permission to edit this course." },
        { status: 403 },
      );
    }

    await prisma.lesson.delete({ where: { id } });

    revalidateTag("course-lessons", "max");

    return NextResponse.json({ message: "Lesson deleted." });
  } catch (error) {
    console.error("[DELETE /api/lessons/:id]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
