/**
 * GET  /api/lessons  — list lessons (admin only, used by quiz builder)
 * POST /api/lessons  — create a lesson inside a course (admin only)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "INSTRUCTOR")) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const noQuiz = searchParams.get("noQuiz") === "true";

    const where: any = {};
    if (courseId) where.courseId = courseId;
    // Filter to only lessons without a quiz (for quiz creation)
    if (noQuiz) where.quiz = { is: null };

    const lessons = await prisma.lesson.findMany({
      where,
      include: {
        course: { select: { id: true, title: true } },
        quiz: { select: { id: true } },
      },
      orderBy: [{ course: { title: "asc" } }, { order: "asc" }],
    });

    return NextResponse.json({
      data: lessons.map((l) => ({
        id: l.id,
        title: l.title,
        type: l.type,
        courseId: l.course.id,
        courseTitle: l.course.title,
        hasQuiz: !!l.quiz,
        order: l.order,
      })),
    });
  } catch (error) {
    console.error("[GET /api/lessons]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "INSTRUCTOR")) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { courseId, sectionId, title, type, content, description, order, duration, isFree } =
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
        sectionId: sectionId ?? null,
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
