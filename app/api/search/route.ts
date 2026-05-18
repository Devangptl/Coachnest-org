/**
 * GET /api/search
 * Full-text + filter course search.
 * Query params: q, category, level, minPrice, maxPrice, sort, page, limit
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { playlistDurations } from "@/services/playlist.service";

export async function GET(req: NextRequest) {
  try {
    const sp       = req.nextUrl.searchParams;
    const q        = sp.get("q")        ?? "";
    const category = sp.get("category") ?? undefined;
    const level    = sp.get("level")    ?? undefined;
    const minPrice = sp.get("minPrice") ? parseFloat(sp.get("minPrice")!) : undefined;
    const maxPrice = sp.get("maxPrice") ? parseFloat(sp.get("maxPrice")!) : undefined;
    const sort     = sp.get("sort")     ?? "popular"; // popular | newest | price_asc | price_desc
    const page     = Math.max(1, parseInt(sp.get("page") ?? "1"));
    const limit    = Math.min(24, parseInt(sp.get("limit") ?? "12"));

    // Build where clause
    const where: Prisma.CourseWhereInput = {
      status: "PUBLISHED",
      ...(q && { OR: [
        { title:       { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { shortDesc:   { contains: q, mode: "insensitive" } },
      ]}),
      ...(category && { category: { slug: category } }),
      ...(level    && { level }),
      ...((minPrice !== undefined || maxPrice !== undefined) && {
        price: {
          ...(minPrice !== undefined && { gte: minPrice }),
          ...(maxPrice !== undefined && { lte: maxPrice }),
        },
      }),
    };

    // Build orderBy
    const orderBy: Prisma.CourseOrderByWithRelationInput =
      sort === "newest"     ? { createdAt:  "desc" }
      : sort === "price_asc"  ? { price:      "asc"  }
      : sort === "price_desc" ? { price:      "desc" }
      : /* popular */           { enrollments: { _count: "desc" } };

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        orderBy,
        skip:  (page - 1) * limit,
        take:  limit,
        include: {
          createdBy: { select: { name: true, avatar: true } },
          category:  { select: { name: true, slug: true } },
          _count:    { select: { enrollments: true, reviews: true } },
          reviews:   { select: { rating: true } },
          tags:      { include: { tag: { select: { name: true, slug: true } } } },
        },
      }),
      prisma.course.count({ where }),
    ]);

    const enriched = courses.map((c) => ({
      ...c,
      avgRating: c.reviews.length
        ? Number((c.reviews.reduce((s, r) => s + r.rating, 0) / c.reviews.length).toFixed(1))
        : 0,
      price:         c.price         ? Number(c.price)         : null,
      discountPrice: c.discountPrice ? Number(c.discountPrice) : null,
    }));

    // Matching public course lists — only on the first page so the section
    // appears once. Resilient if the playlist tables aren't provisioned yet.
    let playlists: unknown[] = [];
    if (page === 1) {
      try {
        const pls = await prisma.coursePlaylist.findMany({
          where: {
            visibility: "PUBLIC",
            ...(q && {
              OR: [
                { title:       { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
              ],
            }),
          },
          include: {
            owner:  { select: { name: true } },
            _count: { select: { items: true, followers: true } },
          },
          orderBy: [{ followers: { _count: "desc" } }, { createdAt: "desc" }],
          take: 8,
        });
        const durations = await playlistDurations(pls.map((p) => p.id));
        playlists = pls.map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          description: p.description,
          coverImage: p.coverImage,
          visibility: p.visibility,
          owner: p.owner,
          _count: p._count,
          totalDuration: durations.get(p.id) ?? 0,
        }));
      } catch {
        playlists = [];
      }
    }

    return NextResponse.json({
      courses: enriched,
      playlists,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[GET /api/search]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
