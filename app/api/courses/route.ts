/**
 * GET  /api/courses — list published courses
 * POST /api/courses — create a new course (admin/instructor)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import slugify from "slugify";

export async function GET() {
  try {
    const courses = await prisma.course.findMany({
      where: { status: "PUBLISHED" },
      include: {
        createdBy: { select: { name: true } },
        category:  { select: { name: true, slug: true } },
        _count:    { select: { lessons: true, enrollments: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ courses });
  } catch (error) {
    console.error("[GET /api/courses]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/** Maximum number of free courses an instructor may create over their lifetime. */
const FREE_COURSE_LIMIT = 5;

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "INSTRUCTOR")) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const {
      title,
      description,
      thumbnail,
      published,
      price,
      isFree,
      level,
      categoryId,
      instructorRevenuePercent,
    } = await req.json();

    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required." }, { status: 400 });
    }

    const wantsFree = Boolean(isFree);

    // ── Free course cap (instructors only; admins are exempt) ──────────────
    if (wantsFree && session.role === "INSTRUCTOR") {
      const freeCourseCount = await prisma.course.count({
        where: { createdById: session.userId, isFree: true },
      });
      if (freeCourseCount >= FREE_COURSE_LIMIT) {
        return NextResponse.json(
          {
            error: `You have reached the limit of ${FREE_COURSE_LIMIT} free courses. All new courses must be paid.`,
            code: "FREE_COURSE_LIMIT_REACHED",
            limit: FREE_COURSE_LIMIT,
            current: freeCourseCount,
          },
          { status: 403 }
        );
      }
    }

    // Free courses from instructors must be reviewed by an admin before going live
    let status: "DRAFT" | "PUBLISHED" | "PENDING_REVIEW" = "DRAFT";
    if (wantsFree && session.role === "INSTRUCTOR") {
      status = "PENDING_REVIEW";
    } else if (published) {
      status = "PUBLISHED";
    }

    // Validate revenue split (70–80 % to instructor)
    let revenuePercent = 70;
    if (instructorRevenuePercent !== undefined) {
      const pct = Number(instructorRevenuePercent);
      if (pct < 70 || pct > 80 || !Number.isInteger(pct)) {
        return NextResponse.json(
          { error: "instructorRevenuePercent must be an integer between 70 and 80." },
          { status: 400 }
        );
      }
      revenuePercent = pct;
    }

    // Generate a unique slug
    let slug = slugify(title, { lower: true, strict: true });
    const existing = await prisma.course.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const course = await prisma.course.create({
      data: {
        title,
        slug,
        description,
        thumbnail: thumbnail || null,
        status,
        price: wantsFree ? null : price ?? null,
        isFree: wantsFree,
        level: level ?? "beginner",
        categoryId: categoryId ?? null,
        createdById: session.userId,
        instructorRevenuePercent: revenuePercent,
      },
    });

    return NextResponse.json({ course }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/courses]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
