/**
 * POST /api/enrollments        — enroll the current student in a course
 * GET  /api/enrollments        — list enrolled courses for current student
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// ─── GET — list my enrollments ────────────────────────────────────────────────
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: session.userId },
      include: {
        course: {
          include: {
            lessons: { select: { id: true } },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });

    // For each enrollment, attach the student's completed lesson count
    const data = await Promise.all(
      enrollments.map(async (e) => {
        const completedCount = await prisma.lessonProgress.count({
          where: {
            userId: session.userId,
            lessonId: { in: e.course.lessons.map((l) => l.id) },
            completed: true,
          },
        });
        const totalLessons = e.course.lessons.length;

        return {
          ...e,
          progress:
            totalLessons > 0
              ? Math.round((completedCount / totalLessons) * 100)
              : 0,
        };
      })
    );

    return NextResponse.json({ enrollments: data });
  } catch (error) {
    console.error("[GET /api/enrollments]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// ─── POST — enroll ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (session.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Only students can enroll in courses." },
        { status: 403 }
      );
    }

    const { courseId } = await req.json();
    if (!courseId) {
      return NextResponse.json({ error: "courseId is required." }, { status: 400 });
    }

    // Verify the course exists and is published
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    // Upsert avoids duplicate enrollment errors
    const enrollment = await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: session.userId, courseId } },
      update: {},
      create: { userId: session.userId, courseId },
    });

    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/enrollments]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
