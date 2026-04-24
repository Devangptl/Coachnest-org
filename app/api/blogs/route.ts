/**
 * GET  /api/blogs — list published blogs (public)
 * POST /api/blogs — create a new blog (admin/instructor)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import slugify from "slugify";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tag = searchParams.get("tag");
    const search = searchParams.get("q");
    const cursor = searchParams.get("cursor");
    const limit = Math.min(Number(searchParams.get("limit")) || 9, 30);

    const where: Record<string, unknown> = { status: "PUBLISHED" as const };

    if (tag) {
      where.tags = { contains: tag, mode: "insensitive" };
    }

    const finalWhere = search
      ? { ...where, OR: [{ title: { contains: search, mode: "insensitive" } }, { content: { contains: search, mode: "insensitive" } }] }
      : where;

    const blogs = await prisma.blog.findMany({
      where: finalWhere,
      include: {
        author: { select: { name: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = blogs.length > limit;
    if (hasMore) blogs.pop();
    const nextCursor = hasMore ? blogs[blogs.length - 1].id : null;

    return NextResponse.json({ blogs, nextCursor });
  } catch (error) {
    console.error("[GET /api/blogs]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "INSTRUCTOR")) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { title, slug: rawSlug, excerpt, content, thumbnail, tags, published } = await req.json();

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required." }, { status: 400 });
    }

    const baseSlug = rawSlug
      ? slugify(String(rawSlug), { lower: true, strict: true })
      : slugify(title, { lower: true, strict: true });
    let slug = baseSlug || slugify(title, { lower: true, strict: true });
    const existing = await prisma.blog.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    // Estimate read time (~200 words per minute)
    const wordCount = content.replace(/<[^>]*>/g, "").split(/\s+/).length;
    const readTime = Math.max(1, Math.round(wordCount / 200));

    const blog = await prisma.blog.create({
      data: {
        title,
        slug,
        excerpt: excerpt || null,
        content,
        thumbnail: thumbnail || null,
        tags: tags || null,
        readTime,
        status: published ? "PUBLISHED" : "DRAFT",
        authorId: session.userId,
      },
    });

    return NextResponse.json({ blog }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/blogs]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
