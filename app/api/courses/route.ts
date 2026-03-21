/**
 * GET  /api/courses — list published courses
 * POST /api/courses — create a new course (admin/instructor)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import slugify from "slugify";

export async function GET() {
  try {
    const courses = await prisma.course.findMany({
      where: { status: "PUBLISHED" },
      include: {
        createdBy: { select: { name: true } },
        category:  { select: { name: true, slug: true } },
        _count:    { select: { lessons: true, enrollments: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ courses });
  } catch (error) {
    console.error("[GET /api/courses]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "INSTRUCTOR")) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { title, description, thumbnail, published, price, isFree, level, categoryId } = await req.json();

    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required." }, { status: 400 });
    }

    // Generate a unique slug
    let slug = slugify(title, { lower: true, strict: true });
    const existing = await prisma.course.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const course = await prisma.course.create({
      data: {
        title,
        slug,
        description,
        thumbnail: thumbnail || null,
        status: published ? "PUBLISHED" : "DRAFT",
        price: price ?? null,
        isFree: isFree ?? false,
        level: level ?? "beginner",
        categoryId: categoryId ?? null,
        createdById: session.userId,
      },
    });

    return NextResponse.json({ course }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/courses]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
