/**
 * GET  /api/instructor/referrals — list instructor's referral links
 * POST /api/instructor/referrals — create a new referral link
 * DELETE via query ?id=XX       — deactivate a referral link
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "INSTRUCTOR" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const links = await prisma.referralLink.findMany({
      where:   { instructorId: session.userId },
      include: { course: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    return NextResponse.json({
      links: links.map((l) => ({
        id:           l.id,
        code:         l.code,
        label:        l.label,
        courseId:     l.courseId,
        courseTitle:  l.course?.title ?? null,
        totalClicks:  l.totalClicks,
        conversions:  l.conversions,
        isActive:     l.isActive,
        createdAt:    l.createdAt,
        url:          l.courseId
          ? `${appUrl}/api/referrals/track?code=${l.code}&courseId=${l.courseId}`
          : `${appUrl}/api/referrals/track?code=${l.code}`,
        conversionRate: l.totalClicks > 0
          ? parseFloat(((l.conversions / l.totalClicks) * 100).toFixed(1))
          : 0,
      })),
    });
  } catch (err) {
    console.error("[GET /api/instructor/referrals]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "INSTRUCTOR" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const { courseId, label } = await req.json();

    // Validate course belongs to instructor (if specified)
    if (courseId) {
      const course = await prisma.course.findUnique({
        where:  { id: courseId },
        select: { createdById: true },
      });
      if (!course || course.createdById !== session.userId) {
        return NextResponse.json({ error: "Course not found or not yours." }, { status: 400 });
      }
    }

    const code = nanoid(8).toUpperCase();

    const link = await prisma.referralLink.create({
      data: {
        instructorId: session.userId,
        code,
        courseId:     courseId ?? null,
        label:        label?.trim() || null,
      },
      include: { course: { select: { id: true, title: true } } },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const url    = link.courseId
      ? `${appUrl}/api/referrals/track?code=${link.code}&courseId=${link.courseId}`
      : `${appUrl}/api/referrals/track?code=${link.code}`;

    return NextResponse.json({ link: { ...link, url } }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/instructor/referrals]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "INSTRUCTOR" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  try {
    const link = await prisma.referralLink.findUnique({
      where: { id },
      select: { instructorId: true },
    });
    if (!link || link.instructorId !== session.userId) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    await prisma.referralLink.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ message: "Referral link deactivated." });
  } catch (err) {
    console.error("[DELETE /api/instructor/referrals]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
