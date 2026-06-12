/**
 * POST /api/sections — create a section (chapter) for a course
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { authorizeCourseEdit } from "@/services/collaboration.service";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { courseId, title } = await req.json();
    if (!courseId || !title?.trim()) {
      return NextResponse.json(
        { error: "courseId and title are required." },
        { status: 400 }
      );
    }

    if (!(await authorizeCourseEdit(session, courseId))) {
      return NextResponse.json(
        { error: "You don't have permission to edit this course." },
        { status: 403 },
      );
    }

    const count = await prisma.section.count({ where: { courseId } });

    const section = await prisma.section.create({
      data: { courseId, title: title.trim(), order: count + 1 },
    });

    revalidateTag("course-lessons", "max");

    return NextResponse.json({ section }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/sections]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
