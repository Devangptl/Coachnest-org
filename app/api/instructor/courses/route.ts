/**
 * GET  /api/instructor/courses  — list instructor's own courses
 * POST /api/instructor/courses  — create a new course owned by the instructor
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import slugify from "slugify";

function requireInstructor(role: string) {
  return role === "INSTRUCTOR" || role === "ADMIN";
}

export async function GET() {
  const session = await getSession();
  if (!session || !requireInstructor(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const courses = await prisma.course.findMany({
    where:   { createdById: session.userId },
    include: { _count: { select: { lessons: true, enrollments: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ courses });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !requireInstructor(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { title, description, thumbnail, price, isFree, level, published } = body;

  if (!title?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "Title and description are required." }, { status: 400 });
  }

  let slug = slugify(title.trim(), { lower: true, strict: true });
  const existing = await prisma.course.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const course = await prisma.course.create({
    data: {
      title:       title.trim(),
      slug,
      description: description.trim(),
      thumbnail:   thumbnail || null,
      price:       isFree ? null : price ? parseFloat(price) : null,
      isFree:      Boolean(isFree),
      level:       level ?? "beginner",
      status:      published ? "PUBLISHED" : "DRAFT",
      createdById: session.userId,
    },
  });

  return NextResponse.json({ course }, { status: 201 });
}
