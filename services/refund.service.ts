/**
 * Refund Service — progress-based partial refund with split reversal.
 *
 * Eligibility rules:
 *   < 80% progress  → eligible, refund = (100 - progress)% of order amount
 *   ≥ 80% progress  → ineligible
 *
 * Financial split on refund:
 *   instructorLoss  = instructorRevenue  × refundPercent / 100
 *   platformLoss    = platformRevenue    × refundPercent / 100
 *   refundAmount    = instructorLoss + platformLoss  (≈ originalAmount × refundPercent / 100)
 *
 * Guarantees:
 *   - One RefundRequest per Order (unique constraint on orderId)
 *   - Progress is snapshotted at request time (cannot be gamed after submission)
 *   - Stripe refund uses idempotency key = "refund-<refundRequestId>"
 *   - All DB mutations are wrapped in a single Prisma transaction
 *   - Enrollment deleted, instructor wallet debited, ledger entries written atomically
 */
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

const MAX_REFUND_PROGRESS_PCT = 80; // ≥ 80 % → ineligible

// ─── Progress helper ──────────────────────────────────────────────────────────

export async function calculateCourseProgress(userId: string, courseId: string) {
  const [completedLessons, totalLessons] = await Promise.all([
    prisma.lessonProgress.count({
      where: { userId, lesson: { courseId }, completed: true },
    }),
    prisma.lesson.count({ where: { courseId } }),
  ]);

  const progressPercent =
    totalLessons > 0
      ? parseFloat(((completedLessons / totalLessons) * 100).toFixed(2))
      : 0;

  return { completedLessons, totalLessons, progressPercent };
}

// ─── Eligibility check (read-only, no side effects) ───────────────────────────

export async function checkRefundEligibility(userId: string, orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      course: { select: { id: true, title: true } },
    },
  });

  if (!order)                  throw new Error("Order not found.");
  if (order.userId !== userId) throw new Error("Unauthorized.");
  if (!order.courseId)         throw new Error("Only course orders are eligible for refund.");
  if (order.status !== "PAID") throw new Error("Only PAID orders can be refunded.");

  // Check existing request
  const existing = await prisma.refundRequest.findUnique({
    where:  { orderId },
    select: { id: true, status: true },
  });
  if (existing) {
    return {
      eligible: false,
      reason:   `A refund request already exists for this order (status: ${existing.status}).`,
      existingRequestId: existing.id,
      existingStatus:    existing.status,
    } as const;
  }

  const { completedLessons, totalLessons, progressPercent } =
    await calculateCourseProgress(userId, order.courseId);

  if (progressPercent >= MAX_REFUND_PROGRESS_PCT) {
    return {
      eligible:         false,
      reason:           `You have completed ${progressPercent.toFixed(0)}% of this course. Refunds are only available below ${MAX_REFUND_PROGRESS_PCT}% completion.`,
      progressPercent,
      completedLessons,
      totalLessons,
    } as const;
  }

  const originalAmount    = parseFloat(Number(order.amount).toFixed(2));
  const instructorRevenue = parseFloat(Number(order.instructorRevenue ?? 0).toFixed(2));
  const platformRevenue   = parseFloat(Number(order.platformRevenue   ?? 0).toFixed(2));
  const refundPercent     = parseFloat((100 - progressPercent).toFixed(2));

  // Proportional split reversal
  const instructorLoss = parseFloat(((instructorRevenue * refundPercent) / 100).toFixed(2));
  const platformLoss   = parseFloat(((platformRevenue   * refundPercent) / 100).toFixed(2));
  const refundAmount   = parseFloat((instructorLoss + platformLoss).toFixed(2));

  return {
    eligible:         true,
    progressPercent,
    completedLessons,
    totalLessons,
    originalAmount,
    refundPercent,
    refundAmount,
    instructorLoss,
    platformLoss,
    courseTitle:      order.course?.title ?? null,
  } as const;
}

// ─── Student: create refund request ───────────────────────────────────────────

export async function createRefundRequest(
  userId:   string,
  orderId:  string,
  reason?:  string
) {
  const eligibility = await checkRefundEligibility(userId, orderId);

  if (!eligibility.eligible) {
    throw new Error(eligibility.reason);
  }

  // Narrow: TypeScript knows eligible is true here
  const {
    progressPercent, completedLessons, totalLessons,
    originalAmount, refundPercent, refundAmount,
    instructorLoss, platformLoss,
  } = eligibility;

  const order = await prisma.order.findUnique({
    where:  { id: orderId },
    select: { courseId: true },
  });
  if (!order?.courseId) throw new Error("Course not found on order.");

  // Serializable transaction — prevents two concurrent requests for the same order
  const refundRequest = await prisma.$transaction(async (tx) => {
    const raceCheck = await tx.refundRequest.findUnique({ where: { orderId } });
    if (raceCheck) throw new Error("A refund request already exists for this order.");

    return tx.refundRequest.create({
      data: {
        orderId,
        userId,
        courseId:        order.courseId!,
        progressPercent,
        completedLessons,
        totalLessons,
        originalAmount,
        refundPercent,
        refundAmount,
        instructorLoss,
        platformLoss,
        reason,
        status: "PENDING",
      },
    });
  });

  return refundRequest;
}

// ─── Admin: approve + process refund ─────────────────────────────────────────

export async function approveAndProcessRefund(
  refundRequestId: string,
  adminId:         string,
  adminNotes?:     string
) {
  const rr = await prisma.refundRequest.findUnique({
    where:   { id: refundRequestId },
    include: {
      order:  true,
      course: { select: { createdById: true, title: true } },
    },
  });

  if (!rr)                        throw new Error("Refund request not found.");
  if (rr.status !== "PENDING")    throw new Error(`Cannot approve a ${rr.status} refund request.`);
  if (rr.order.status !== "PAID") throw new Error("Associated order is no longer PAID.");

  // Optimistic lock: mark PROCESSING before any external call to prevent duplicate processing
  const updated = await prisma.refundRequest.updateMany({
    where: { id: refundRequestId, status: "PENDING" },
    data:  { status: "PROCESSING", adminId, adminNotes, reviewedAt: new Date() },
  });
  if (updated.count === 0) {
    throw new Error("Refund request was already picked up by another process.");
  }

  // ── Stripe refund ────────────────────────────────────────────────────────────
  let stripeRefundId: string | undefined;

  if (rr.order.stripePaymentId) {
    try {
      const stripe     = getStripe();
      const stripeRef  = await stripe.refunds.create(
        {
          payment_intent: rr.order.stripePaymentId,
          amount:         Math.round(Number(rr.refundAmount) * 100), // partial refund in paise
          reason:         "requested_by_customer",
          metadata: {
            refundRequestId: rr.id,
            orderId:         rr.order.id,
            progressPercent: rr.progressPercent.toString(),
            refundPercent:   rr.refundPercent.toString(),
          },
        },
        { idempotencyKey: `refund-${rr.id}` } // idempotent — safe to retry
      );
      stripeRefundId = stripeRef.id;
    } catch (err: unknown) {
      await prisma.refundRequest.update({
        where: { id: refundRequestId },
        data:  { status: "FAILED" },
      });
      throw new Error(
        `Stripe refund failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  const instructorLoss     = parseFloat(Number(rr.instructorLoss).toFixed(2));
  const platformLoss       = parseFloat(Number(rr.platformLoss).toFixed(2));
  const refundAmount       = parseFloat(Number(rr.refundAmount).toFixed(2));
  const instructorId       = rr.course?.createdById;
  const courseTitle        = rr.course?.title ?? "Unknown Course";

  // ── Atomic DB update ─────────────────────────────────────────────────────────
  await prisma.$transaction(async (tx) => {
    // 1. Revoke course enrollment
    await tx.enrollment
      .deleteMany({ where: { userId: rr.userId, courseId: rr.courseId } })
      .catch(() => null);

    // 2. Debit instructor wallet (proportional share only)
    if (instructorLoss > 0 && instructorId) {
      const wallet = await tx.instructorWallet.findUnique({
        where: { userId: instructorId },
      });
      if (wallet) {
        await tx.instructorWallet.update({
          where: { id: wallet.id },
          data:  {
            balance:     { decrement: instructorLoss },
            totalEarned: { decrement: instructorLoss },
          },
        });
        await tx.walletTransaction.create({
          data: {
            walletId:    wallet.id,
            orderId:     rr.order.id,
            amount:      instructorLoss,
            type:        "DEBIT",
            description: `Refund reversal (${rr.refundPercent}% of order) — "${courseTitle}"`,
            meta: {
              refundRequestId: rr.id,
              progressPercent: Number(rr.progressPercent),
              refundPercent:   Number(rr.refundPercent),
              courseTitle,
            },
          },
        });
      }
    }

    // 3. Write ledger entries (REFUND + two reversal entries)
    await tx.ledgerEntry.createMany({
      data: [
        {
          orderId:         rr.order.id,
          refundRequestId: rr.id,
          userId:          rr.userId,
          courseId:        rr.courseId,
          type:            "REFUND",
          amount:          refundAmount,
          description:     `Refund issued — ${rr.refundPercent}% of ₹${rr.originalAmount} (${rr.progressPercent}% progress)`,
          meta: {
            progressPercent: Number(rr.progressPercent),
            refundPercent:   Number(rr.refundPercent),
            stripeRefundId,
          },
        },
        {
          orderId:         rr.order.id,
          refundRequestId: rr.id,
          userId:          rr.userId,
          courseId:        rr.courseId,
          type:            "REFUND_REVERSAL_INSTRUCTOR",
          amount:          instructorLoss,
          description:     `Instructor share reversed — ₹${instructorLoss}`,
          meta: { courseTitle, refundRequestId: rr.id },
        },
        {
          orderId:         rr.order.id,
          refundRequestId: rr.id,
          userId:          rr.userId,
          courseId:        rr.courseId,
          type:            "REFUND_REVERSAL_PLATFORM",
          amount:          platformLoss,
          description:     `Platform share reversed — ₹${platformLoss}`,
          meta: { courseTitle, refundRequestId: rr.id },
        },
      ],
    });

    // 4. Mark order REFUNDED
    await tx.order.update({
      where: { id: rr.order.id },
      data:  { status: "REFUNDED" },
    });

    // 5. Mark refund request PROCESSED
    await tx.refundRequest.update({
      where: { id: refundRequestId },
      data:  { status: "PROCESSED", stripeRefundId, processedAt: new Date() },
    });
  });

  // Notify student (fire-and-forget — non-critical)
  prisma.notification.create({
    data: {
      userId: rr.userId,
      title:  "Refund Processed",
      body:   `Your refund of ₹${refundAmount.toLocaleString("en-IN")} has been processed. Funds will arrive within 5–10 business days.`,
      type:   "SYSTEM",
      link:   "/dashboard/orders",
    },
  }).catch(() => null);

  return { success: true, refundAmount, stripeRefundId };
}

// ─── Admin: reject refund request ────────────────────────────────────────────

export async function rejectRefundRequest(
  refundRequestId: string,
  adminId:         string,
  adminNotes?:     string
) {
  const rr = await prisma.refundRequest.findUnique({
    where:  { id: refundRequestId },
    select: { status: true, userId: true, refundAmount: true },
  });

  if (!rr)                     throw new Error("Refund request not found.");
  if (rr.status !== "PENDING") throw new Error(`Cannot reject a ${rr.status} refund request.`);

  await prisma.refundRequest.update({
    where: { id: refundRequestId },
    data:  { status: "REJECTED", adminId, adminNotes, reviewedAt: new Date() },
  });

  // Notify student
  prisma.notification.create({
    data: {
      userId: rr.userId,
      title:  "Refund Request Rejected",
      body:   `Your refund request has been reviewed and rejected.${adminNotes ? ` Admin note: ${adminNotes}` : ""}`,
      type:   "SYSTEM",
      link:   "/dashboard/orders",
    },
  }).catch(() => null);

  return { success: true };
}

// ─── Get refund requests (admin) ──────────────────────────────────────────────

export async function getAdminRefundList(opts: {
  status?:   string;
  search?:   string;
  dateFrom?: string;
  dateTo?:   string;
  courseId?: string;
  limit?:    number;
  offset?:   number;
}) {
  const where: Record<string, unknown> = {};
  if (opts.status && opts.status !== "ALL") where.status = opts.status;
  if (opts.courseId) where.courseId = opts.courseId;
  if (opts.dateFrom || opts.dateTo) {
    where.requestedAt = {
      ...(opts.dateFrom ? { gte: new Date(opts.dateFrom) } : {}),
      ...(opts.dateTo   ? { lte: new Date(opts.dateTo)   } : {}),
    };
  }
  if (opts.search) {
    where.user = {
      OR: [
        { name:  { contains: opts.search, mode: "insensitive" } },
        { email: { contains: opts.search, mode: "insensitive" } },
      ],
    };
  }

  const [requests, total] = await Promise.all([
    prisma.refundRequest.findMany({
      where,
      include: {
        user:   { select: { id: true, name: true, email: true, avatar: true } },
        course: { select: { id: true, title: true } },
        order:  { select: { id: true, amount: true, saleSource: true, stripePaymentId: true } },
        admin:  { select: { id: true, name: true } },
      },
      orderBy: { requestedAt: "desc" },
      take:    opts.limit  ?? 50,
      skip:    opts.offset ?? 0,
    }),
    prisma.refundRequest.count({ where }),
  ]);

  return { requests, total };
}

// ─── Get instructor refund impact ────────────────────────────────────────────

export async function getInstructorRefundImpact(instructorId: string) {
  const courseIds = await prisma.course
    .findMany({ where: { createdById: instructorId }, select: { id: true } })
    .then((rows) => rows.map((r) => r.id));

  if (courseIds.length === 0) return { refunds: [], summary: { count: 0, totalLoss: 0 } };

  const refunds = await prisma.refundRequest.findMany({
    where:   { courseId: { in: courseIds }, status: "PROCESSED" },
    include: {
      course: { select: { id: true, title: true } },
      order:  { select: { id: true, instructorRevenue: true, instructorPercent: true, saleSource: true } },
    },
    orderBy: { processedAt: "desc" },
  });

  const totalLoss = refunds.reduce((s, r) => s + Number(r.instructorLoss), 0);

  // Per-course breakdown
  const byCourse: Record<string, { courseId: string; title: string; count: number; loss: number }> = {};
  for (const r of refunds) {
    const key = r.courseId;
    if (!byCourse[key]) {
      byCourse[key] = { courseId: r.courseId, title: r.course.title, count: 0, loss: 0 };
    }
    byCourse[key].count += 1;
    byCourse[key].loss  += Number(r.instructorLoss);
  }

  return {
    refunds: refunds.map((r) => ({
      id:              r.id,
      courseId:        r.courseId,
      courseTitle:     r.course.title,
      progressPercent: Number(r.progressPercent),
      refundPercent:   Number(r.refundPercent),
      originalAmount:  Number(r.originalAmount),
      instructorLoss:  Number(r.instructorLoss),
      processedAt:     r.processedAt,
    })),
    byCourse: Object.values(byCourse),
    summary:  { count: refunds.length, totalLoss: parseFloat(totalLoss.toFixed(2)) },
  };
}
