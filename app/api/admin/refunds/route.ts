/**
 * GET /api/admin/refunds — list all refund requests with filters + stats
 *
 * Query params:
 *   status?   — PENDING | PROCESSING | PROCESSED | REJECTED | FAILED | ALL
 *   search?   — student name / email
 *   dateFrom? — ISO date
 *   dateTo?   — ISO date
 *   courseId? — filter by course
 *   limit?    — page size (default 50)
 *   offset?   — pagination offset
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAdminRefundList } from "@/services/refund.service";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { searchParams } = req.nextUrl;
    const status   = searchParams.get("status")   || undefined;
    const search   = searchParams.get("search")   || undefined;
    const dateFrom = searchParams.get("dateFrom") || undefined;
    const dateTo   = searchParams.get("dateTo")   || undefined;
    const courseId = searchParams.get("courseId") || undefined;
    const limit    = searchParams.get("limit")    ? Number(searchParams.get("limit"))  : 50;
    const offset   = searchParams.get("offset")   ? Number(searchParams.get("offset")) : 0;

    const [{ requests, total }, stats] = await Promise.all([
      getAdminRefundList({ status, search, dateFrom, dateTo, courseId, limit, offset }),
      // Status counts for filter pills
      prisma.refundRequest.groupBy({
        by:    ["status"],
        _count: { id: true },
        _sum:   { refundAmount: true },
      }),
    ]);

    return NextResponse.json({
      data: requests.map((r) => ({
        id:              r.id,
        orderId:         r.orderId,
        status:          r.status,
        progressPercent: Number(r.progressPercent),
        completedLessons: r.completedLessons,
        totalLessons:    r.totalLessons,
        refundPercent:   Number(r.refundPercent),
        originalAmount:  Number(r.originalAmount),
        refundAmount:    Number(r.refundAmount),
        instructorLoss:  Number(r.instructorLoss),
        platformLoss:    Number(r.platformLoss),
        reason:          r.reason,
        adminNotes:      r.adminNotes,
        admin:           r.admin,
        stripeRefundId:  r.stripeRefundId,
        requestedAt:     r.requestedAt,
        reviewedAt:      r.reviewedAt,
        processedAt:     r.processedAt,
        user:            r.user,
        course:          r.course,
        orderAmount:     Number(r.order.amount),
        saleSource:      r.order.saleSource,
        stripePaymentId: r.order.stripePaymentId,
      })),
      total,
      stats: stats.map((s) => ({
        status: s.status,
        count:  s._count.id,
        total:  Number(s._sum.refundAmount ?? 0),
      })),
    });
  } catch (err) {
    console.error("[GET /api/admin/refunds]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
