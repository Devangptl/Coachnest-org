/**
 * GET  /api/community/peer-review — list assignments (my submissions + available for review)
 * POST /api/community/peer-review — submit an assignment for peer review
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFeatureAccess } from "@/lib/feature-access";
import { emit } from "@/lib/realtime/emit";
import { channels, events } from "@/lib/realtime/channels";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const tab = searchParams.get("tab") || "submissions"; // submissions | review-queue
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;

    if (tab === "submissions") {
      const [assignments, total] = await Promise.all([
        prisma.peerReviewAssignment.findMany({
          where: { submittedById: session.userId },
          include: {
            _count: { select: { reviews: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.peerReviewAssignment.count({ where: { submittedById: session.userId } }),
      ]);
      return NextResponse.json({ assignments, total, page, totalPages: Math.ceil(total / limit) });
    }

    // Review queue: assignments NOT submitted by user, NOT already reviewed by user
    const [assignments, total] = await Promise.all([
      prisma.peerReviewAssignment.findMany({
        where: {
          submittedById: { not: session.userId },
          reviews: { none: { reviewerId: session.userId } },
        },
        include: {
          submittedBy: { select: { id: true, name: true, avatar: true } },
          _count: { select: { reviews: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.peerReviewAssignment.count({
        where: {
          submittedById: { not: session.userId },
          reviews: { none: { reviewerId: session.userId } },
        },
      }),
    ]);

    return NextResponse.json({ assignments, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("[GET /api/community/peer-review]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const canAccess = await hasFeatureAccess(session.userId, session.role, "community");
    if (!canAccess) {
      return NextResponse.json(
        {
          error: "Peer review requires purchasing the Community add-on.",
          featureSlug: "community",
        },
        { status: 403 }
      );
    }

    const { title, content, courseId, lessonId } = await req.json();
    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const assignment = await prisma.peerReviewAssignment.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        courseId: courseId || null,
        lessonId: lessonId || null,
        submittedById: session.userId,
      },
      include: { _count: { select: { reviews: true } } },
    });

    const activity = await prisma.activityFeedEvent.create({
      data: {
        userId: session.userId,
        type: "REVIEW_SUBMITTED",
        title: `Submitted "${title.trim()}" for peer review`,
        meta: { assignmentId: assignment.id },
      },
    });
    await emit(channels.activityFeed(), events.activityCreated, activity);

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/community/peer-review]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
