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
    // 1. Get user's profession keywords (including custom professions)
    const userProfessions = await prisma.userProfession.findMany({
      where: { userId: session.userId },
      include: { profession: { select: { courseKeywords: true, name: true } } },
    });

    // Build keywords from both standard professions (courseKeywords + name)
    // and custom professions (customName)
    const keywords: string[] = [];
    for (const up of userProfessions) {
      if (up.profession) {
        // Add explicit courseKeywords
        keywords.push(...(up.profession.courseKeywords ?? []));
        // Also use the profession name itself as an implicit keyword
        keywords.push(up.profession.name);
      } else if (up.customName) {
        // Custom profession — use the customName as a keyword
        keywords.push(up.customName);
      }
    }
    // Deduplicate keywords (case-insensitive)
    const seen = new Set<string>();
    const uniqueKeywords = keywords.filter((k) => {
      const lower = k.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });

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
        tags:      { include: { tag: { select: { name: true, slug: true } } } },
        _count:    { select: { enrollments: true, lessons: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100, // candidate pool
    });

    /** Normalize a string for comparison: lowercase, replace hyphens with spaces, collapse whitespace */
    function normalize(s: string): string {
      return s.toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim();
    }

    // 4. Score each course by keyword overlap
    type ScoredCourse = (typeof courses)[number] & { score: number };

    let scored: ScoredCourse[];

    if (uniqueKeywords.length === 0) {
      // No professions → rank by total enrollments
      scored = courses
        .map((c) => ({ ...c, score: c._count.enrollments }))
        .sort((a, b) => b.score - a.score);
    } else {
      scored = courses
        .map((c) => {
          // Build haystack from both slugs AND names for category + tags
          const catSlug = normalize(c.category?.slug ?? "");
          const catName = normalize(c.category?.name ?? "");
          const tagEntries = c.tags.flatMap((t) => [
            normalize(t.tag.slug),
            normalize(t.tag.name),
          ]);
          const haystack = [catSlug, catName, ...tagEntries].filter(Boolean);

          let score = 0;
          for (const kw of uniqueKeywords) {
            const k = normalize(kw);
            if (!k) continue;
            // Category / tag match (highest relevance)
            if (haystack.some((h) => h.includes(k) || k.includes(h))) score += 3;
            // Title match
            if (normalize(c.title).includes(k))                       score += 2;
            // Description match
            if (normalize(c.description).includes(k))                 score += 0.5;
          }

          // Small boost for popularity
          score += c._count.enrollments * 0.01;

          return { ...c, score };
        })
        .sort((a, b) => b.score - a.score);
    }

    // Only show courses that actually matched keywords (score beyond just popularity boost)
    const relevant = scored.filter((c) => c.score > c._count.enrollments * 0.01);
    // Fall back to popularity-ranked if no keyword matches at all
    const pool = relevant.length > 0 ? relevant : scored;
    const recommended = pool.slice(0, limit).map(({ score: _s, ...c }) => c);

    // Include both standard and custom profession names for the "Based on" label
    const professionNames = userProfessions
      .map((up) => up.profession?.name ?? up.customName)
      .filter(Boolean);

    return NextResponse.json({
      courses: recommended,
      basedOn: professionNames,
    });
  } catch (error) {
    console.error("[GET /api/recommendations]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
