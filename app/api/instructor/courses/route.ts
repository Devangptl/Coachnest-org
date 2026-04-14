/**
 * GET  /api/instructor/courses  — list instructor's own courses
 * POST /api/instructor/courses  — create a new course owned by the instructor
 *
 * Rules enforced:
 *  - Instructors may create at most FREE_COURSE_LIMIT free courses (lifetime).
 *  - Free courses are automatically set to PENDING_REVIEW until an admin approves them.
 *  - instructorRevenuePercent must be between 70 and 80 (inclusive).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import slugify from "slugify";

const FREE_COURSE_LIMIT = 5;

function requireInstructor(role: string) {
  return role === "INSTRUCTOR" || role === "ADMIN";
}

export async function GET() {
  const session = await getSession();
  if (!session || !requireInstructor(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const courses = await prisma.course.findMany({
    where:   { createdById: session.userId },
    include: { _count: { select: { lessons: true, enrollments: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Include how many free courses this instructor has used
  const freeCourseCount = await prisma.course.count({
    where: { createdById: session.userId, isFree: true },
  });

  return NextResponse.json({ courses, freeCourseCount, freeCourseLimit: FREE_COURSE_LIMIT });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !requireInstructor(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { title, description, thumbnail, price, isFree, level, published, instructorRevenuePercent } = body;

  if (!title?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "Title and description are required." }, { status: 400 });
  }

  const wantsFree = Boolean(isFree);

  // ── Free course cap (instructors only; admins are exempt) ──────────────────
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

  // Free instructor courses require admin review before going live
  let status: "DRAFT" | "PUBLISHED" | "PENDING_REVIEW" = "DRAFT";
  if (wantsFree && session.role === "INSTRUCTOR") {
    status = "PENDING_REVIEW";
  } else if (published) {
    status = "PUBLISHED";
  }

  // Validate revenue split (70–80 % to instructor, platform gets remainder)
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

  let slug = slugify(title.trim(), { lower: true, strict: true });
  const existing = await prisma.course.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const course = await prisma.course.create({
    data: {
      title:                   title.trim(),
      slug,
      description:             description.trim(),
      thumbnail:               thumbnail || null,
      price:                   wantsFree ? null : price ? parseFloat(price) : null,
      isFree:                  wantsFree,
      level:                   level ?? "beginner",
      status,
      createdById:             session.userId,
      instructorRevenuePercent: revenuePercent,
    },
  });

  return NextResponse.json({ course }, { status: 201 });
}
