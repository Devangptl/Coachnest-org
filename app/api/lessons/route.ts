/**
 * POST /api/lessons  — create a lesson inside a course (admin only)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "INSTRUCTOR")) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { courseId, title, type, content, description, order, duration, isFree } =
      await req.json();

    if (!courseId || !title) {
      return NextResponse.json(
        { error: "courseId and title are required." },
        { status: 400 }
      );
    }

    // Determine order: append after last lesson if not provided
    const lessonOrder =
      order ??
      ((await prisma.lesson.count({ where: { courseId } })) + 1);

    const lesson = await prisma.lesson.create({
      data: {
        courseId,
        title,
        type: type ?? "TEXT",
        content: content ?? null,
        description: description ?? null,
        order: lessonOrder,
        duration: duration ?? null,
        isFree: isFree ?? false,
      },
    });

    return NextResponse.json({ lesson }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/lessons]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
