/**
 * POST /api/refunds  — student submits a refund request
 * GET  /api/refunds  — student views their own refund requests
 *
 * Progress is snapshotted at request time so it cannot be manipulated after.
 * One refund request per order (enforced by unique constraint + transaction).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  checkRefundEligibility,
  createRefundRequest,
} from "@/services/refund.service";
import { prisma } from "@/lib/prisma";

// ── POST — create refund request ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { orderId, reason } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: "orderId is required." }, { status: 400 });
    }

    const refundRequest = await createRefundRequest(session.userId, orderId, reason);

    return NextResponse.json(
      { message: "Refund request submitted successfully.", data: refundRequest },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error.";
    const status = msg.includes("Unauthorized")     ? 403
                 : msg.includes("not found")        ? 404
                 : msg.includes("Not eligible")     ? 422
                 : msg.includes("already exists")   ? 409
                 : msg.includes("eligible")         ? 422
                 : 500;
    console.error("[POST /api/refunds]", err);
    return NextResponse.json({ error: msg }, { status });
  }
}

// ── GET — list own refund requests ───────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status") || undefined;

    const requests = await prisma.refundRequest.findMany({
      where: {
        userId: session.userId,
        ...(status ? { status: status as never } : {}),
      },
      include: {
        course: { select: { id: true, title: true, thumbnail: true } },
        order:  { select: { id: true, amount: true, createdAt: true } },
      },
      orderBy: { requestedAt: "desc" },
    });

    return NextResponse.json({
      data: requests.map((r) => ({
        id:              r.id,
        orderId:         r.orderId,
        status:          r.status,
        progressPercent: Number(r.progressPercent),
        refundPercent:   Number(r.refundPercent),
        originalAmount:  Number(r.originalAmount),
        refundAmount:    Number(r.refundAmount),
        instructorLoss:  Number(r.instructorLoss),
        platformLoss:    Number(r.platformLoss),
        reason:          r.reason,
        adminNotes:      r.adminNotes,
        requestedAt:     r.requestedAt,
        reviewedAt:      r.reviewedAt,
        processedAt:     r.processedAt,
        course:          r.course,
        orderAmount:     Number(r.order.amount),
        orderDate:       r.order.createdAt,
      })),
    });
  } catch (err) {
    console.error("[GET /api/refunds]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
