/**
 * GET    /api/admin/students/[id] — Full student detail with enrollments, orders, quiz attempts
 * PATCH  /api/admin/students/[id] — Update student role
 * DELETE /api/admin/students/[id] — Delete student account
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcProgress } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;

    const student = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
        headline: true,
        website: true,
        role: true,
        createdAt: true,
        enrollments: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                thumbnail: true,
                _count: { select: { lessons: true } },
              },
            },
          },
          orderBy: { enrolledAt: "desc" },
        },
        orders: {
          include: {
            course: { select: { id: true, title: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        certificates: {
          include: {
            course: { select: { id: true, title: true } },
          },
          orderBy: { issuedAt: "desc" },
        },
        quizAttempts: {
          include: {
            quiz: {
              select: {
                id: true,
                title: true,
                passMark: true,
                lesson: { select: { courseId: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        reviews: {
          include: {
            course: { select: { id: true, title: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            enrollments: true,
            certificates: true,
            orders: true,
            reviews: true,
            quizAttempts: true,
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }

    // Enrich enrollments with progress
    const enrichedEnrollments = await Promise.all(
      student.enrollments.map(async (e) => {
        const lessonIds = await prisma.lesson.findMany({
          where: { courseId: e.courseId },
          select: { id: true },
        });
        const completedCount = await prisma.lessonProgress.count({
          where: {
            userId: id,
            lessonId: { in: lessonIds.map((l) => l.id) },
            completed: true,
          },
        });
        return {
          ...e,
          completedLessons: completedCount,
          totalLessons: e.course._count.lessons,
          progress: calcProgress(completedCount, e.course._count.lessons),
        };
      })
    );

    // Calculate total spent
    const totalSpent = student.orders
      .filter((o) => o.status === "PAID")
      .reduce((sum, o) => sum + Number(o.amount), 0);

    return NextResponse.json({
      student: {
        ...student,
        enrollments: enrichedEnrollments,
        totalSpent,
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/students/[id]]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    const { role } = await req.json();

    if (!["STUDENT", "INSTRUCTOR", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, role: true },
    });

    return NextResponse.json({ user: updated, message: "Role updated." });
  } catch (error) {
    console.error("[PATCH /api/admin/students/[id]]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;

    // Prevent self-deletion
    if (id === session.userId) {
      return NextResponse.json(
        { error: "You cannot delete your own account." },
        { status: 400 }
      );
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ message: "Student deleted." });
  } catch (error) {
    console.error("[DELETE /api/admin/students/[id]]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
