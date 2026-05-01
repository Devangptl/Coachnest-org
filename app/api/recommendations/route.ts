/**
 * GET /api/recommendations?limit=6
 *
 * Returns published courses ranked by relevance to the authenticated user's
 * selected professions. Falls back to top-enrolled courses when the user has
 * no professions, clearly flagging the response as non-personalised.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function normalize(s: string): string {
  return s.toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim();
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "6"), 20);

  try {
    // 1. User's profession keywords
    const userProfessions = await prisma.userProfession.findMany({
      where:   { userId: session.userId },
      include: { profession: { select: { courseKeywords: true, name: true } } },
    });

    const keywords: string[] = [];
    for (const up of userProfessions) {
      if (up.profession) {
        keywords.push(...(up.profession.courseKeywords ?? []), up.profession.name);
      } else if (up.customName) {
        keywords.push(up.customName);
      }
    }
    const seen = new Set<string>();
    const uniqueKeywords = keywords.filter((k) => {
      const lower = k.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });

    // 2. Already-enrolled IDs to exclude
    const enrollments = await prisma.enrollment.findMany({
      where:  { userId: session.userId },
      select: { courseId: true },
    });
    const enrolledIds = enrollments.map((e) => e.courseId);

    // 3. Candidate pool — fetch scalar + relation fields needed for display
    const courses = await prisma.course.findMany({
      where: {
        status: "PUBLISHED",
        id:     { notIn: enrolledIds },
      },
      include: {
        createdBy: { select: { name: true } },
        category:  { select: { name: true, slug: true } },
        tags:      { include: { tag: { select: { name: true, slug: true } } } },
        reviews:   { select: { rating: true } },
        _count:    { select: { enrollments: true, lessons: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // 4. Score — track keyword score separately from popularity boost
    const scored = courses.map((c) => {
      const catSlug  = normalize(c.category?.slug ?? "");
      const catName  = normalize(c.category?.name ?? "");
      const tagParts = c.tags.flatMap((t) => [normalize(t.tag.slug), normalize(t.tag.name)]);
      const haystack = [catSlug, catName, ...tagParts].filter(Boolean);

      let keywordScore = 0;
      for (const kw of uniqueKeywords) {
        const k = normalize(kw);
        if (!k) continue;
        if (haystack.some((h) => h.includes(k) || k.includes(h))) keywordScore += 3;
        if (normalize(c.title).includes(k))                        keywordScore += 2;
        if (normalize(c.description).includes(k))                  keywordScore += 0.5;
      }

      const score = keywordScore + c._count.enrollments * 0.01;

      // Compute avg rating inline
      const ratingSum   = c.reviews.reduce((s, r) => s + r.rating, 0);
      const reviewCount = c.reviews.length;
      const avgRating   = reviewCount > 0
        ? Math.round((ratingSum / reviewCount) * 10) / 10
        : null;

      return {
        id:            c.id,
        title:         c.title,
        description:   c.description,
        thumbnail:     c.thumbnail,
        price:         c.price         ? Number(c.price)         : null,
        discountPrice: c.discountPrice ? Number(c.discountPrice) : null,
        isFree:        c.isFree,
        level:         c.level,
        instructorName: c.createdBy.name,
        enrollmentCount: c._count.enrollments,
        totalLessons:  c._count.lessons,
        avgRating,
        reviewCount:   reviewCount > 0 ? reviewCount : null,
        keywordScore,
        score,
      };
    });

    // 5. If user has professions: only return courses that actually matched keywords.
    //    If no professions (or zero matches): fall back to top-enrolled, flag as popular.
    const hasKeywords = uniqueKeywords.length > 0;
    const matched     = scored.filter((c) => c.keywordScore > 0).sort((a, b) => b.score - a.score);
    const isPersonalized = hasKeywords && matched.length > 0;

    const pool = isPersonalized
      ? matched
      : scored.sort((a, b) => b.enrollmentCount - a.enrollmentCount);

    const recommended = pool.slice(0, limit).map(({ keywordScore: _ks, score: _s, ...c }) => c);

    const professionNames = userProfessions
      .map((up) => up.profession?.name ?? up.customName)
      .filter(Boolean);

    return NextResponse.json({
      courses:         recommended,
      basedOn:         isPersonalized ? professionNames : [],
      isPersonalized,
    });
  } catch (error) {
    console.error("[GET /api/recommendations]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
