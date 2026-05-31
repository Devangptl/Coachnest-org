/**
 * GET    /api/blogs/[id] — get single blog
 * PATCH  /api/blogs/[id] — update blog (admin/instructor)
 * DELETE /api/blogs/[id] — delete blog (admin/instructor)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidateTag } from "next/cache";
import slugify from "slugify";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const blog = await prisma.blog.findUnique({
      where: { id },
      include: { author: { select: { name: true, avatar: true } } },
    });

    if (!blog) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ blog });
  } catch (error) {
    console.error("[GET /api/blogs/[id]]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "INSTRUCTOR")) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await ctx.params;
    const body = await req.json();
    const { title, slug: rawSlug, excerpt, content, thumbnail, tags, published } = body;

    const existing = await prisma.blog.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });

    const data: Record<string, unknown> = {};

    if (title && title !== existing.title) {
      data.title = title;
    }

    // Recompute slug if the client provided one, or if the title changed and
    // no explicit slug was supplied.
    const wantsSlugUpdate =
      (typeof rawSlug === "string" && rawSlug.trim()) ||
      (title && title !== existing.title);
    if (wantsSlugUpdate) {
      const source = rawSlug && String(rawSlug).trim() ? String(rawSlug) : title;
      let slug = slugify(source, { lower: true, strict: true });
      if (slug && slug !== existing.slug) {
        const dup = await prisma.blog.findUnique({ where: { slug } });
        if (dup && dup.id !== id) slug = `${slug}-${Date.now().toString(36)}`;
        data.slug = slug;
      }
    }

    if (excerpt !== undefined) data.excerpt = excerpt || null;
    if (content !== undefined) {
      data.content = content;
      const wordCount = content.replace(/<[^>]*>/g, "").split(/\s+/).length;
      data.readTime = Math.max(1, Math.round(wordCount / 200));
    }
    if (thumbnail !== undefined) data.thumbnail = thumbnail || null;
    if (tags !== undefined) data.tags = tags || null;
    if (published !== undefined) data.status = published ? "PUBLISHED" : "DRAFT";

    const blog = await prisma.blog.update({ where: { id }, data });
    revalidateTag("blogs", "max");
    return NextResponse.json({ blog });
  } catch (error) {
    console.error("[PATCH /api/blogs/[id]]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "INSTRUCTOR")) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await ctx.params;
    await prisma.blog.delete({ where: { id } });
    revalidateTag("blogs", "max");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/blogs/[id]]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
