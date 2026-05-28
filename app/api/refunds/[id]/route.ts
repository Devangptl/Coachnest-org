/**
 * GET /api/refunds/[id]  — student views a specific refund request
 * Must belong to the authenticated student.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;

    const rr = await prisma.refundRequest.findUnique({
      where:   { id },
      include: {
        course: { select: { id: true, title: true, thumbnail: true } },
        order:  { select: { id: true, amount: true, createdAt: true, razorpayPaymentId: true } },
        admin:  { select: { name: true } },
      },
    });

    if (!rr) {
      return NextResponse.json({ error: "Refund request not found." }, { status: 404 });
    }
    // Students can only see their own requests
    if (rr.userId !== session.userId && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    return NextResponse.json({
      data: {
        id:              rr.id,
        orderId:         rr.orderId,
        status:          rr.status,
        progressPercent: Number(rr.progressPercent),
        completedLessons: rr.completedLessons,
        totalLessons:    rr.totalLessons,
        refundPercent:   Number(rr.refundPercent),
        originalAmount:  Number(rr.originalAmount),
        refundAmount:    Number(rr.refundAmount),
        instructorLoss:  Number(rr.instructorLoss),
        platformLoss:    Number(rr.platformLoss),
        reason:          rr.reason,
        adminNotes:      rr.adminNotes,
        adminName:       rr.admin?.name ?? null,
        razorpayRefundId: rr.razorpayRefundId,
        requestedAt:     rr.requestedAt,
        reviewedAt:      rr.reviewedAt,
        processedAt:     rr.processedAt,
        course:          rr.course,
      },
    });
  } catch (err) {
    console.error("[GET /api/refunds/[id]]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
