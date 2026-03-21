/**
 * GET  /api/reviews?courseId=  — list reviews for a course
 * POST /api/reviews            — create or update a review (enrolled students only)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const courseId = req.nextUrl.searchParams.get("courseId");
    if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });

    const reviews = await prisma.review.findMany({
      where: { courseId },
      include: { user: { select: { name: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
    });

    // Compute aggregate rating
    const avg = reviews.length
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

    return NextResponse.json({ reviews, avgRating: Number(avg.toFixed(1)), total: reviews.length });
  } catch (err) {
    console.error("[GET /api/reviews]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { courseId, rating, comment } = await req.json();
    if (!courseId || !rating) return NextResponse.json({ error: "courseId and rating required" }, { status: 400 });
    if (rating < 1 || rating > 5) return NextResponse.json({ error: "Rating must be 1–5" }, { status: 400 });

    // Must be enrolled
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: session.userId, courseId } },
    });
    if (!enrollment) return NextResponse.json({ error: "Not enrolled in this course" }, { status: 403 });

    const review = await prisma.review.upsert({
      where: { userId_courseId: { userId: session.userId, courseId } },
      create: { userId: session.userId, courseId, rating, comment },
      update: { rating, comment, updatedAt: new Date() },
      include: { user: { select: { name: true, avatar: true } } },
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/reviews]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
