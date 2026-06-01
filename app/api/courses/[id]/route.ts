/**
 * GET    /api/courses/:id  — fetch course with lessons
 * PATCH  /api/courses/:id  — update course (admin/instructor)
 * DELETE /api/courses/:id  — delete course (admin/instructor)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import slugify from "slugify";
import {
  getCollaboratorPermission,
  logCourseActivity,
} from "@/services/collaboration.service";

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

    // Permission gate: ADMIN bypasses; otherwise the user must be the
    // owner or a collaborator with edit rights on this course.
    let perm = null as Awaited<ReturnType<typeof getCollaboratorPermission>>;
    if (session.role !== "ADMIN") {
      perm = await getCollaboratorPermission(id, session.userId);
      if (!perm?.canEditContent) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }
    }

    const data = await req.json();

    // Only the OWNER (or admin) can publish or archive the course.
    if (data.published !== undefined || data.status !== undefined) {
      if (session.role !== "ADMIN" && !perm?.canPublish) {
        return NextResponse.json(
          { error: "Only the course owner can change publish status." },
          { status: 403 },
        );
      }
    }

    // Build update payload — only include provided fields
    const update: Record<string, unknown> = {};
    if (data.title !== undefined) {
      update.title = data.title;
      update.slug  = slugify(data.title, { lower: true, strict: true });
    }
    if (data.description !== undefined)  update.description  = data.description;
    if (data.shortDesc !== undefined)    update.shortDesc    = data.shortDesc?.trim() || null;
    if (data.thumbnail !== undefined)    update.thumbnail    = data.thumbnail || null;
    if (data.previewVideo !== undefined) update.previewVideo = data.previewVideo?.trim() || null;
    if (data.price !== undefined)        update.price        = data.price;
    if (data.discountPrice !== undefined) {
      const dp = data.discountPrice;
      update.discountPrice =
        dp === null || dp === "" ? null : Number.isFinite(Number(dp)) ? Number(dp) : null;
    }
    if (data.isFree !== undefined)       update.isFree       = data.isFree;
    if (data.level !== undefined)        update.level        = data.level;
    if (data.language !== undefined)     update.language     = data.language?.trim() || "English";
    if (data.categoryId !== undefined)   update.categoryId   = data.categoryId || null;
    if (data.published !== undefined)    update.status       = data.published ? "PUBLISHED" : "DRAFT";
    if (data.status !== undefined)       update.status       = data.status;
    if (data.instructorRevenuePercent !== undefined) {
      const pct = Number(data.instructorRevenuePercent);
      if (!Number.isInteger(pct) || pct < 70 || pct > 80) {
        return NextResponse.json(
          { error: "instructorRevenuePercent must be an integer between 70 and 80." },
          { status: 400 }
        );
      }
      // Instructors can't change their own revenue split; admin only.
      if (session.role === "ADMIN") update.instructorRevenuePercent = pct;
    }

    // If a price is set and isFree is true (or being set true) — clear the price
    if (update.isFree === true) {
      update.price = null;
      update.discountPrice = null;
    }

    const course = await prisma.course.update({ where: { id }, data: update });

    // Optional: replace tags if a `tagNames` array is provided
    if (Array.isArray(data.tagNames)) {
      const cleaned = Array.from(
        new Set(
          (data.tagNames as unknown[])
            .map((t) => String(t).trim())
            .filter((t) => t.length > 0 && t.length <= 40)
        )
      );

      const tags = await Promise.all(
        cleaned.map(async (name) => {
          const slugified = slugify(name, { lower: true, strict: true });
          if (!slugified) return null;
          return prisma.tag.upsert({
            where:  { slug: slugified },
            create: { name, slug: slugified },
            update: {},
          });
        })
      );
      const tagIds = tags.filter((t): t is NonNullable<typeof t> => !!t).map((t) => t.id);

      await prisma.courseTag.deleteMany({
        where: { courseId: id, tagId: { notIn: tagIds.length ? tagIds : [""] } },
      });
      await Promise.all(
        tagIds.map((tagId) =>
          prisma.courseTag.upsert({
            where:  { courseId_tagId: { courseId: id, tagId } },
            create: { courseId: id, tagId },
            update: {},
          })
        )
      );
    }

    await logCourseActivity(id, session.userId, "course.updated", {
      fields: Object.keys(update),
    });

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
    if (session.role !== "ADMIN") {
      const perm = await getCollaboratorPermission(id, session.userId);
      if (!perm?.canDeleteCourse) {
        return NextResponse.json(
          { error: "Only the course owner can delete this course." },
          { status: 403 },
        );
      }
    }

    await prisma.course.delete({ where: { id } });

    return NextResponse.json({ message: "Course deleted." });
  } catch (error) {
    console.error("[DELETE /api/courses/:id]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
