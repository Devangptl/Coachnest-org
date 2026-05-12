/**
 * GET /api/admin/instructor-approvals
 * Returns all PENDING instructor applications with basic profile data.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "PENDING";

  const applications = await prisma.user.findMany({
    where: {
      role: "INSTRUCTOR",
      instructorStatus: status as any,
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      headline: true,
      bio: true,
      website: true,
      instructorStatus: true,
      instructorAppliedAt: true,
      instructorReviewedAt: true,
      instructorRejectReason: true,
    },
    orderBy: { instructorAppliedAt: "desc" },
  });

  return NextResponse.json(
    applications.map((a) => ({
      ...a,
      instructorAppliedAt:  a.instructorAppliedAt?.toISOString()  ?? null,
      instructorReviewedAt: a.instructorReviewedAt?.toISOString() ?? null,
    }))
  );
}
