/**
 * GET    /api/org/[slug]/courses/[id] — course detail (course:view)
 * PATCH  /api/org/[slug]/courses/[id] — update (course:manage_any, or manage_own + creator)
 * DELETE /api/org/[slug]/courses/[id] — delete (course:manage_any, or manage_own + creator)
 *
 * Every query is compound-scoped ({ id, organizationId }) so ids from other
 * tenants 404.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgPermission, orgAuthErrorResponse, type OrgContext } from "@/lib/org-auth";
import { can } from "@/lib/org-permissions";

type Params = { params: Promise<{ slug: string; id: string }> };

async function findOrgCourse(ctx: OrgContext, id: string) {
  return prisma.course.findFirst({
    where: { id, organizationId: ctx.org.id },
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { lessons: true, enrollments: true } },
    },
  });
}

function canManage(ctx: OrgContext, createdById: string): boolean {
  if (ctx.isPlatformAdmin || can(ctx.role, "course:manage_any")) return true;
  return can(ctx.role, "course:manage_own") && createdById === ctx.session.userId;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { slug, id } = await params;
    const ctx = await requireOrgPermission(slug, "course:view");

    const course = await findOrgCourse(ctx, id);
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
    return NextResponse.json({ course });
  } catch (error) {
    const res = orgAuthErrorResponse(error);
    if (res) return res;
    console.error("[GET /api/org/[slug]/courses/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { slug, id } = await params;
    const ctx = await requireOrgPermission(slug, "course:view");

    const course = await findOrgCourse(ctx, id);
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
    if (!canManage(ctx, course.createdById)) {
      return NextResponse.json({ error: "You can only edit courses you created" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { title, description, shortDesc, thumbnail, previewVideo, level, language, categoryId, status } = body;

    const updated = await prisma.course.update({
      where: { id: course.id },
      data: {
        ...(title?.trim() ? { title: title.trim() } : {}),
        ...(description?.trim() ? { description: description.trim() } : {}),
        ...(shortDesc !== undefined ? { shortDesc: shortDesc?.trim() || null } : {}),
        ...(thumbnail !== undefined ? { thumbnail: thumbnail || null } : {}),
        ...(previewVideo !== undefined ? { previewVideo: previewVideo?.trim() || null } : {}),
        ...(level ? { level } : {}),
        ...(language !== undefined ? { language: language?.trim() || undefined } : {}),
        ...(categoryId !== undefined ? { categoryId: categoryId || null } : {}),
        ...(status === "DRAFT" || status === "PUBLISHED" || status === "ARCHIVED"
          ? { status }
          : {}),
        // org courses stay free; pricing fields are never honored here
        isFree: true,
        price: null,
        discountPrice: null,
      },
    });

    return NextResponse.json({ course: updated });
  } catch (error) {
    const res = orgAuthErrorResponse(error);
    if (res) return res;
    console.error("[PATCH /api/org/[slug]/courses/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { slug, id } = await params;
    const ctx = await requireOrgPermission(slug, "course:view");

    const course = await findOrgCourse(ctx, id);
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
    if (!canManage(ctx, course.createdById)) {
      return NextResponse.json({ error: "You can only delete courses you created" }, { status: 403 });
    }

    await prisma.course.delete({ where: { id: course.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const res = orgAuthErrorResponse(error);
    if (res) return res;
    console.error("[DELETE /api/org/[slug]/courses/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
