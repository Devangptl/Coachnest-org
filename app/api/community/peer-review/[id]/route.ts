/**
 * GET    /api/community/peer-review/[id] — get assignment with reviews
 * PATCH  /api/community/peer-review/[id] — edit assignment (author, only if no reviews yet)
 * DELETE /api/community/peer-review/[id] — delete assignment (author, or admin always)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { title, content } = await req.json();

    const assignment = await prisma.peerReviewAssignment.findUnique({
      where: { id },
      select: { submittedById: true, _count: { select: { reviews: true } } },
    });
    if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    if (assignment.submittedById !== session.userId) {
      return NextResponse.json({ error: "Not your submission" }, { status: 403 });
    }
    if (assignment._count.reviews > 0) {
      return NextResponse.json(
        { error: "Cannot edit a submission that already has reviews" },
        { status: 400 }
      );
    }

    const data: Record<string, string> = {};
    if (typeof title === "string" && title.trim()) data.title = title.trim();
    if (typeof content === "string" && content.trim()) data.content = content.trim();
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const updated = await prisma.peerReviewAssignment.update({
      where: { id },
      data,
      include: {
        submittedBy: { select: { id: true, name: true, avatar: true } },
        _count: { select: { reviews: true } },
      },
    });
    return NextResponse.json({ assignment: updated });
  } catch (err) {
    console.error("[PATCH /api/community/peer-review/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const assignment = await prisma.peerReviewAssignment.findUnique({
      where: { id },
      select: { submittedById: true },
    });
    if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

    const isAdmin = session.role === "ADMIN" || session.role === "INSTRUCTOR";
    if (assignment.submittedById !== session.userId && !isAdmin) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    await prisma.peerReviewAssignment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/community/peer-review/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
