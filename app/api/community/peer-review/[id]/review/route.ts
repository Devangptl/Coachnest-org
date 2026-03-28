/**
 * POST /api/community/peer-review/[id]/review — submit a peer review
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: assignmentId } = await params;
    const { rating, feedback, rubricScores } = await req.json();

    if (!rating || !feedback?.trim()) {
      return NextResponse.json({ error: "Rating and feedback are required" }, { status: 400 });
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be 1–5" }, { status: 400 });
    }

    // Verify assignment exists
    const assignment = await prisma.peerReviewAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

    // Can't review own submission
    if (assignment.submittedById === session.userId) {
      return NextResponse.json({ error: "Cannot review your own submission" }, { status: 400 });
    }

    // Check duplicate
    const existing = await prisma.peerReview.findUnique({
      where: { assignmentId_reviewerId: { assignmentId, reviewerId: session.userId } },
    });
    if (existing) return NextResponse.json({ error: "Already reviewed this assignment" }, { status: 400 });

    const review = await prisma.peerReview.create({
      data: {
        assignmentId,
        reviewerId: session.userId,
        rating,
        feedback: feedback.trim(),
        rubricScores: rubricScores || null,
      },
      include: {
        reviewer: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Notify the author
    await prisma.notification.create({
      data: {
        userId: assignment.submittedById,
        title: "New peer review received",
        body: `${session.name} reviewed your submission "${assignment.title}"`,
        type: "PEER_REVIEW",
        link: `/community/peer-review/${assignmentId}`,
      },
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/community/peer-review/[id]/review]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
