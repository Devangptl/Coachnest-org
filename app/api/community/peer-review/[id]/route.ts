/**
 * GET /api/community/peer-review/[id] — get assignment with reviews
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const assignment = await prisma.peerReviewAssignment.findUnique({
      where: { id },
      include: {
        submittedBy: { select: { id: true, name: true, avatar: true } },
        reviews: {
          include: {
            reviewer: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    return NextResponse.json({ assignment });
  } catch (err) {
    console.error("[GET /api/community/peer-review/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
