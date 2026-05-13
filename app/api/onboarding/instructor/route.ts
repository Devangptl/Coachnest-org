import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * PUT /api/onboarding/instructor
 * Saves instructor profile data collected during onboarding and marks it complete.
 */
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }
  if (session.role !== "INSTRUCTOR") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await req.json();
  const {
    headline,
    bio,
    website,
    teachingTopics,
    complete,
  } = body as {
    headline?:      string;
    bio?:           string;
    website?:       string | null;
    teachingTopics?: string[];
    complete?:      boolean;
  };

  // Validate lengths if provided
  if (headline !== undefined && headline.trim().length > 120) {
    return NextResponse.json(
      { error: "Headline must be 120 characters or fewer." },
      { status: 422 }
    );
  }
  if (bio !== undefined && bio.trim().length > 2000) {
    return NextResponse.json(
      { error: "Bio must be 2 000 characters or fewer." },
      { status: 422 }
    );
  }
  if (teachingTopics !== undefined && teachingTopics.length > 10) {
    return NextResponse.json(
      { error: "You can select up to 10 teaching topics." },
      { status: 422 }
    );
  }

  const updateData: Record<string, unknown> = {};
  if (headline  !== undefined) updateData.headline      = headline.trim();
  if (bio       !== undefined) updateData.bio           = bio.trim();
  if (website   !== undefined) updateData.website       = website?.trim() || null;
  if (teachingTopics !== undefined) updateData.teachingTopics = teachingTopics;
  if (complete) updateData.hasCompletedInstructorOnboarding = true;

  await prisma.user.update({
    where: { id: session.userId },
    data:  updateData,
  });

  return NextResponse.json({ ok: true });
}
