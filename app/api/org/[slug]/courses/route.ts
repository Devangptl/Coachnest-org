/**
 * GET  /api/org/[slug]/courses — list org courses (course:view; non-authors see PUBLISHED only)
 * POST /api/org/[slug]/courses — create an org course (course:create)
 *
 * organizationId is forced server-side from the org context — org courses are
 * free to members (covered by the org subscription), so price fields are ignored.
 */
import { NextRequest, NextResponse } from "next/server";
import slugify from "slugify";
import { prisma } from "@/lib/prisma";
import { requireOrgPermission, orgAuthErrorResponse } from "@/lib/org-auth";
import { can } from "@/lib/org-permissions";
import { enforcePlanLimit } from "@/services/organization.service";

type Params = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const ctx = await requireOrgPermission(slug, "course:view");

    const mineOnly = req.nextUrl.searchParams.get("mine") === "true";
    // Authors / managers see every status; learners and observers see PUBLISHED only.
    const seesAllStatuses =
      ctx.isPlatformAdmin || can(ctx.role, "course:author_area") || can(ctx.role, "course:manage_any");

    const courses = await prisma.course.findMany({
      where: {
        organizationId: ctx.org.id,
        ...(seesAllStatuses ? {} : { status: "PUBLISHED" }),
        ...(mineOnly ? { createdById: ctx.session.userId } : {}),
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { lessons: true, enrollments: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ courses });
  } catch (error) {
    const res = orgAuthErrorResponse(error);
    if (res) return res;
    console.error("[GET /api/org/[slug]/courses]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const ctx = await requireOrgPermission(slug, "course:create");

    await enforcePlanLimit(ctx.org.id, "courses");

    const body = await req.json().catch(() => ({}));
    const { title, description, shortDesc, thumbnail, previewVideo, level, language, categoryId, published } = body;

    if (!title?.trim() || !description?.trim()) {
      return NextResponse.json({ error: "Title and description are required." }, { status: 400 });
    }

    let courseSlug = slugify(title.trim(), { lower: true, strict: true });
    const existing = await prisma.course.findUnique({ where: { slug: courseSlug } });
    if (existing) courseSlug = `${courseSlug}-${Date.now().toString(36)}`;

    const course = await prisma.course.create({
      data: {
        title: title.trim(),
        slug: courseSlug,
        description: description.trim(),
        shortDesc: shortDesc?.trim() || null,
        thumbnail: thumbnail || null,
        previewVideo: previewVideo?.trim() || null,
        isFree: true, // access is covered by the org subscription
        price: null,
        level: level ?? "beginner",
        language: language?.trim() || undefined,
        categoryId: categoryId || null,
        status: published ? "PUBLISHED" : "DRAFT",
        createdById: ctx.session.userId,
        organizationId: ctx.org.id,
      },
    });

    return NextResponse.json({ course }, { status: 201 });
  } catch (error) {
    const res = orgAuthErrorResponse(error);
    if (res) return res;
    console.error("[POST /api/org/[slug]/courses]", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: message.includes("limit") ? 409 : 500 });
  }
}
