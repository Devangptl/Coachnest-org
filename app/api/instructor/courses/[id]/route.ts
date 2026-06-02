/**
 * GET    /api/instructor/courses/:id  — fetch own course with lessons
 * PATCH  /api/instructor/courses/:id  — update own course
 * DELETE /api/instructor/courses/:id  — delete own course
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import slugify from "slugify";
import {
  authorizeCourseEdit,
  getCollaboratorPermission,
} from "@/services/collaboration.service";

type Params = { params: Promise<{ id: string }> };

async function getAccessibleCourse(courseId: string) {
  return prisma.course.findUnique({
    where: { id: courseId },
    include: { lessons: { orderBy: { order: "asc" } } },
  });
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || (session.role !== "INSTRUCTOR" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (session.role !== "ADMIN") {
    const perm = await getCollaboratorPermission(id, session.userId);
    if (!perm) return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }
  const course = await getAccessibleCourse(id);
  if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });

  return NextResponse.json({ course });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || (session.role !== "INSTRUCTOR" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!(await authorizeCourseEdit(session, id))) {
    return NextResponse.json(
      { error: "You don't have permission to edit this course." },
      { status: 403 },
    );
  }
  const existing = await prisma.course.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Course not found." }, { status: 404 });

  const data = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};

  if (data.title !== undefined) {
    update.title = data.title;
    update.slug  = slugify(data.title, { lower: true, strict: true });
  }
  if (data.description  !== undefined) update.description  = data.description;
  if (data.shortDesc    !== undefined) update.shortDesc    = data.shortDesc?.trim() || null;
  if (data.thumbnail    !== undefined) update.thumbnail    = data.thumbnail || null;
  if (data.previewVideo !== undefined) update.previewVideo = data.previewVideo?.trim() || null;
  if (data.level        !== undefined) update.level        = data.level;
  if (data.language     !== undefined) update.language     = data.language?.trim() || "English";
  if (data.categoryId   !== undefined) update.categoryId   = data.categoryId || null;
  if (data.isFree       !== undefined) update.isFree       = data.isFree;
  if (data.price        !== undefined) {
    update.price = data.isFree ? null : data.price ? parseFloat(data.price) : null;
  }
  if (data.discountPrice !== undefined) {
    const dp = data.discountPrice;
    update.discountPrice =
      dp === null || dp === "" ? null : Number.isFinite(Number(dp)) ? Number(dp) : null;
  }
  if (data.status !== undefined) {
    // Only OWNER (or ADMIN) may change publish status. EDITOR can edit
    // content but not flip DRAFT ↔ PUBLISHED / PENDING_REVIEW / ARCHIVED.
    if (session.role !== "ADMIN") {
      const perm = await getCollaboratorPermission(id, session.userId);
      if (!perm?.canPublish) {
        return NextResponse.json(
          { error: "Only the course owner can change publish status." },
          { status: 403 },
        );
      }
    }
    update.status = data.status;
  }
  if (data.instructorRevenuePercent !== undefined && session.role === "ADMIN") {
    const pct = Number(data.instructorRevenuePercent);
    if (!Number.isInteger(pct) || pct < 70 || pct > 80) {
      return NextResponse.json(
        { error: "instructorRevenuePercent must be an integer between 70 and 80." },
        { status: 400 }
      );
    }
    update.instructorRevenuePercent = pct;
  }

  if (update.isFree === true) {
    update.price = null;
    update.discountPrice = null;
  }

  const course = await prisma.course.update({ where: { id }, data: update });

  // Replace tag set if tagNames is provided
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

  return NextResponse.json({ course });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || (session.role !== "INSTRUCTOR" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  // Delete = OWNER only (or ADMIN). canDeleteCourse is true only for OWNER.
  if (session.role !== "ADMIN") {
    const perm = await getCollaboratorPermission(id, session.userId);
    if (!perm?.canDeleteCourse) {
      return NextResponse.json(
        { error: "Only the course owner can delete this course." },
        { status: 403 },
      );
    }
  }
  const existing = await prisma.course.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Course not found." }, { status: 404 });

  await prisma.course.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
