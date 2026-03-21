/**
 * GET /api/search
 * Full-text + filter course search.
 * Query params: q, category, level, minPrice, maxPrice, sort, page, limit
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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
        { title:       { contains: q } },
        { description: { contains: q } },
        { shortDesc:   { contains: q } },
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

    return NextResponse.json({
      courses: enriched,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[GET /api/search]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
