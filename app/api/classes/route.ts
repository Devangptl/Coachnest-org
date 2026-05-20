/**
 * GET  /api/classes  — list published classes (browse) or instructor's own classes
 * POST /api/classes  — create new class (instructor only)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createClass } from "@/services/class.service";
import { createClassSchema } from "@/lib/validation/class";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope"); // "mine" | "enrolled" | undefined
  const session = await getSession();

  if (scope === "mine") {
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const classes = await prisma.class.findMany({
      where: { instructorId: session.userId },
      include: {
        _count: { select: { enrollments: true, courses: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ classes });
  }

  if (scope === "enrolled") {
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const enrollments = await prisma.classEnrollment.findMany({
      where: { userId: session.userId, status: "APPROVED" },
      include: {
        class: {
          include: {
            instructor: { select: { id: true, name: true, avatar: true } },
            _count: { select: { courses: true, enrollments: true } },
          },
        },
      },
      orderBy: { approvedAt: "desc" },
    });
    return NextResponse.json({ classes: enrollments.map((e) => e.class) });
  }

  // Public browse
  const classes = await prisma.class.findMany({
    where: { status: "PUBLISHED", visibility: "PUBLIC" },
    include: {
      instructor: { select: { id: true, name: true, avatar: true } },
      _count: { select: { courses: true, enrollments: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ classes });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "INSTRUCTOR" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createClassSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const cls = await createClass(session.userId, parsed.data);
    return NextResponse.json({ class: cls }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/classes]", err);
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 });
  }
}
