/**
 * GET /api/referrals/track?code=ABC123&courseId=XYZ
 *
 * Tracks a referral link click by incrementing totalClicks, then redirects
 * the visitor to the target course page with ?ref=CODE appended so the
 * checkout flow can read it.
 *
 * Referral link format given to instructors:
 *   https://yourapp.com/api/referrals/track?code=ABC123&courseId=XYZ
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const code     = req.nextUrl.searchParams.get("code");
  const courseId = req.nextUrl.searchParams.get("courseId");

  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const link = await prisma.referralLink.findUnique({
      where:  { code },
      select: { id: true, courseId: true, isActive: true },
    });

    if (!link || !link.isActive) {
      // Invalid / inactive link — redirect to home
      return NextResponse.redirect(new URL("/", appUrl));
    }

    // Increment click count
    await prisma.referralLink.update({
      where: { id: link.id },
      data:  { totalClicks: { increment: 1 } },
    });

    // Resolve destination course
    const targetCourseId = courseId ?? link.courseId;
    const dest = targetCourseId
      ? `${appUrl}/courses/${targetCourseId}?ref=${code}`
      : `${appUrl}/courses?ref=${code}`;

    return NextResponse.redirect(new URL(dest));
  } catch (error) {
    console.error("[referrals/track]", error);
    return NextResponse.redirect(new URL("/", appUrl));
  }
}
