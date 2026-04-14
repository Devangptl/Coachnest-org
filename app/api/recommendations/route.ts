/**
 * GET /api/recommendations?limit=8
 *
 * Returns published courses ranked by relevance to the authenticated user's
 * selected professions (keyword overlap with course category/tags).
 * Falls back to top-enrolled courses when the user has no professions yet.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "8"), 20);

  try {
    // 1. Get user's profession keywords
    const userProfessions = await prisma.userProfession.findMany({
      where: { userId: session.userId, professionId: { not: null } },
      include: { profession: { select: { courseKeywords: true, name: true } } },
    });

    const keywords: string[] = userProfessions.flatMap(
      (up) => up.profession?.courseKeywords ?? []
    );

    // 2. Fetch already-enrolled course IDs to exclude
    const enrollments = await prisma.enrollment.findMany({
      where:  { userId: session.userId },
      select: { courseId: true },
    });
    const enrolledIds = enrollments.map((e) => e.courseId);

    // 3. Fetch published courses (not already enrolled)
    const courses = await prisma.course.findMany({
      where: {
        status: "PUBLISHED",
        id:     { notIn: enrolledIds },
      },
      include: {
        createdBy: { select: { name: true } },
        category:  { select: { name: true, slug: true } },
        tags:      { include: { tag: { select: { slug: true } } } },
        _count:    { select: { enrollments: true, lessons: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100, // candidate pool
    });

    // 4. Score each course by keyword overlap
    type ScoredCourse = (typeof courses)[number] & { score: number };

    let scored: ScoredCourse[];

    if (keywords.length === 0) {
      // No professions → rank by total enrollments
      scored = courses
        .map((c) => ({ ...c, score: c._count.enrollments }))
        .sort((a, b) => b.score - a.score);
    } else {
      scored = courses
        .map((c) => {
          const catSlug  = c.category?.slug?.toLowerCase() ?? "";
          const tagSlugs = c.tags.map((t) => t.tag.slug.toLowerCase());
          const haystack = [catSlug, ...tagSlugs];

          let score = 0;
          for (const kw of keywords) {
            const k = kw.toLowerCase();
            if (haystack.some((h) => h.includes(k) || k.includes(h))) score += 2;
            if (c.title.toLowerCase().includes(k))                    score += 1;
            if (c.description.toLowerCase().includes(k))              score += 0.5;
          }

          // Small boost for popularity
          score += c._count.enrollments * 0.01;

          return { ...c, score };
        })
        .sort((a, b) => b.score - a.score);
    }

    const recommended = scored.slice(0, limit).map(({ score: _s, ...c }) => c);

    const professionNames = userProfessions.map((up) => up.profession?.name).filter(Boolean);

    return NextResponse.json({
      courses: recommended,
      basedOn: professionNames,
    });
  } catch (error) {
    console.error("[GET /api/recommendations]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
