/**
 * GET    /api/courses/:id  — fetch course with lessons
 * PATCH  /api/courses/:id  — update course (admin/instructor)
 * DELETE /api/courses/:id  — delete course (admin/instructor)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import slugify from "slugify";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        lessons:   { orderBy: { order: "asc" } },
        createdBy: { select: { name: true } },
        category:  { select: { name: true, slug: true } },
        _count:    { select: { enrollments: true, reviews: true } },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    return NextResponse.json({ course });
  } catch (error) {
    console.error("[GET /api/courses/:id]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "INSTRUCTOR")) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    const data = await req.json();

    // Build update payload — only include provided fields
    const update: Record<string, unknown> = {};
    if (data.title !== undefined) {
      update.title = data.title;
      update.slug  = slugify(data.title, { lower: true, strict: true });
    }
    if (data.description !== undefined) update.description = data.description;
    if (data.thumbnail !== undefined)   update.thumbnail   = data.thumbnail;
    if (data.price !== undefined)       update.price       = data.price;
    if (data.isFree !== undefined)      update.isFree      = data.isFree;
    if (data.level !== undefined)       update.level       = data.level;
    if (data.categoryId !== undefined)  update.categoryId  = data.categoryId;
    if (data.published !== undefined)   update.status       = data.published ? "PUBLISHED" : "DRAFT";
    if (data.status !== undefined)      update.status       = data.status;

    const course = await prisma.course.update({ where: { id }, data: update });

    return NextResponse.json({ course });
  } catch (error) {
    console.error("[PATCH /api/courses/:id]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "INSTRUCTOR")) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    await prisma.course.delete({ where: { id } });

    return NextResponse.json({ message: "Course deleted." });
  } catch (error) {
    console.error("[DELETE /api/courses/:id]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
