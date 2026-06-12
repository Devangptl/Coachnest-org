/**
 * Organization subscription billing — payment finalization, renewals,
 * upgrades/downgrades, expiry sweep, and admin-initiated refunds.
 *
 * Payment flow mirrors payment.service.ts: PENDING transaction + Razorpay
 * order → signature verification (or webhook) → idempotent finalize.
 * Refund flow mirrors refund.service.ts: optimistic lock → Razorpay refund →
 * atomic DB transaction; FAILED state is retryable.
 */
import { prisma } from "@/lib/prisma";
import { getRazorpay } from "@/lib/razorpay";
import { syncOrgMetadata } from "@/lib/org-metadata";
import { createOrgRazorpayOrder } from "@/services/organization.service";
import {
  sendOrgPaymentReceiptEmail,
  sendOrgSubscriptionExpiredEmail,
  sendOrgWelcomeEmail,
} from "@/lib/email";
import type { BillingCycle, OrgTransactionType } from "@/lib/generated/prisma/client";

function addCycle(from: Date, cycle: BillingCycle): Date {
  const d = new Date(from);
  if (cycle === "YEARLY") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

// ─── Finalization (idempotent — called from verify-payment AND webhook) ───────

export async function finalizeOrgSubscriptionPayment(
  orgTransactionId: string,
  razorpayPaymentId: string,
) {
  const txn = await prisma.organizationTransaction.findUnique({
    where: { id: orgTransactionId },
    include: {
      subscription: { include: { plan: true } },
      organization: { select: { id: true, name: true, slug: true, email: true, status: true } },
    },
  });
  if (!txn) throw new Error("Transaction not found");
  if (txn.status === "PAID" || txn.status === "REFUNDED" || txn.status === "PARTIALLY_REFUNDED") {
    return { organizationId: txn.organizationId, alreadyFinalized: true };
  }
  if (!txn.subscription) throw new Error("Transaction has no subscription");

  const sub = txn.subscription;
  const now = new Date();
  const isFirstActivation = sub.status === "PENDING";

  // Period math by transaction type:
  //  SUBSCRIPTION/UPGRADE — new period starts now
  //  RENEWAL              — extends from max(now, current endDate); applies a
  //                         scheduled downgrade if one is pending
  let startDate = sub.startDate ?? now;
  let endDate: Date;
  let planId = sub.planId;
  let billingCycle = sub.billingCycle;
  let amount = Number(sub.amount);

  if (txn.type === "RENEWAL") {
    const base = sub.endDate && sub.endDate > now ? sub.endDate : now;
    if (sub.pendingPlanId) {
      const pendingPlan = await prisma.subscriptionPlan.findUnique({
        where: { id: sub.pendingPlanId },
      });
      if (pendingPlan) {
        planId = pendingPlan.id;
        billingCycle = sub.pendingBillingCycle ?? billingCycle;
        amount =
          billingCycle === "YEARLY"
            ? Number(pendingPlan.priceYearly)
            : Number(pendingPlan.priceMonthly);
      }
    }
    endDate = addCycle(base, billingCycle);
  } else if (txn.type === "UPGRADE") {
    const notes = (txn.notes ?? {}) as { planId?: string; billingCycle?: BillingCycle };
    if (notes.planId) planId = notes.planId;
    if (notes.billingCycle) billingCycle = notes.billingCycle;
    const plan = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { id: planId } });
    amount = billingCycle === "YEARLY" ? Number(plan.priceYearly) : Number(plan.priceMonthly);
    startDate = now;
    endDate = addCycle(now, billingCycle);
  } else {
    // First SUBSCRIPTION payment
    startDate = now;
    endDate = addCycle(now, billingCycle);
  }

  await prisma.$transaction([
    prisma.organizationTransaction.update({
      where: { id: txn.id },
      data: { status: "PAID", razorpayPaymentId },
    }),
    prisma.organizationSubscription.update({
      where: { id: sub.id },
      data: {
        status: "ACTIVE",
        startDate,
        endDate,
        planId,
        billingCycle,
        amount,
        pendingPlanId: null,
        pendingBillingCycle: null,
        cancelledAt: null,
      },
    }),
    prisma.organization.update({
      where: { id: txn.organizationId },
      data: { status: "ACTIVE" },
    }),
  ]);

  if (txn.paidByUserId) await syncOrgMetadata(txn.paidByUserId);

  const recipient = txn.organization.email;
  if (recipient) {
    if (isFirstActivation) {
      sendOrgWelcomeEmail(recipient, txn.organization.name, txn.organization.slug).catch(
        console.error,
      );
    }
    sendOrgPaymentReceiptEmail(
      recipient,
      txn.organization.name,
      txn.organization.slug,
      Number(txn.amount),
      txn.type,
      endDate,
    ).catch(console.error);
  }

  return { organizationId: txn.organizationId, alreadyFinalized: false };
}

// ─── Renewal / plan change ────────────────────────────────────────────────────

async function getActiveSubscription(organizationId: string) {
  const sub = await prisma.organizationSubscription.findFirst({
    where: { organizationId, status: { in: ["ACTIVE", "EXPIRED"] } },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });
  if (!sub) throw new Error("No subscription found for this organization");
  return sub;
}

/** Creates a PENDING renewal transaction + Razorpay order. */
export async function createRenewalOrder(organizationId: string, userId: string) {
  const sub = await getActiveSubscription(organizationId);

  let amount = Number(sub.amount);
  let planName = sub.plan.name;
  if (sub.pendingPlanId) {
    const pending = await prisma.subscriptionPlan.findUnique({ where: { id: sub.pendingPlanId } });
    if (pending) {
      const cycle = sub.pendingBillingCycle ?? sub.billingCycle;
      amount = cycle === "YEARLY" ? Number(pending.priceYearly) : Number(pending.priceMonthly);
      planName = pending.name;
    }
  }

  const txn = await prisma.organizationTransaction.create({
    data: {
      organizationId,
      subscriptionId: sub.id,
      type: "RENEWAL",
      status: "PENDING",
      amount,
      paidByUserId: userId,
      notes: { planName, billingCycle: sub.pendingBillingCycle ?? sub.billingCycle },
    },
  });
  const rzpOrder = await createOrgRazorpayOrder(txn.id, amount);
  return { transactionId: txn.id, razorpayOrderId: rzpOrder.id, amount, currency: "INR" };
}

/**
 * Upgrade: prorated charge now (credit for unused days of the current period),
 * new full period starts on payment. Downgrade: free — scheduled, applied at
 * the next renewal.
 */
export async function changePlan(
  organizationId: string,
  newPlanId: string,
  billingCycle: BillingCycle,
  userId: string,
) {
  const sub = await getActiveSubscription(organizationId);
  const newPlan = await prisma.subscriptionPlan.findUnique({ where: { id: newPlanId } });
  if (!newPlan || !newPlan.isActive) throw new Error("Plan not found");
  if (newPlan.id === sub.planId && billingCycle === sub.billingCycle) {
    throw new Error("Organization is already on this plan");
  }

  const newPrice =
    billingCycle === "YEARLY" ? Number(newPlan.priceYearly) : Number(newPlan.priceMonthly);
  const currentPrice = Number(sub.amount);
  const isUpgrade = newPrice > currentPrice;

  if (!isUpgrade) {
    await prisma.$transaction([
      prisma.organizationSubscription.update({
        where: { id: sub.id },
        data: { pendingPlanId: newPlan.id, pendingBillingCycle: billingCycle },
      }),
      prisma.organizationTransaction.create({
        data: {
          organizationId,
          subscriptionId: sub.id,
          type: "DOWNGRADE",
          status: "PAID", // zero-amount audit record
          amount: 0,
          paidByUserId: userId,
          notes: {
            planId: newPlan.id,
            planName: newPlan.name,
            billingCycle,
            appliesAtRenewal: true,
          },
        },
      }),
    ]);
    return { scheduled: true as const, planName: newPlan.name };
  }

  // Prorated upgrade charge: full new price minus credit for the unused
  // share of the current period.
  let charge = newPrice;
  const now = new Date();
  if (sub.status === "ACTIVE" && sub.startDate && sub.endDate && sub.endDate > now) {
    const periodMs = sub.endDate.getTime() - sub.startDate.getTime();
    const remainingMs = sub.endDate.getTime() - now.getTime();
    const credit = currentPrice * (remainingMs / periodMs);
    charge = Math.max(1, parseFloat((newPrice - credit).toFixed(2)));
  }

  const txn = await prisma.organizationTransaction.create({
    data: {
      organizationId,
      subscriptionId: sub.id,
      type: "UPGRADE",
      status: "PENDING",
      amount: charge,
      paidByUserId: userId,
      notes: { planId: newPlan.id, planName: newPlan.name, billingCycle },
    },
  });
  const rzpOrder = await createOrgRazorpayOrder(txn.id, charge);
  return {
    scheduled: false as const,
    transactionId: txn.id,
    razorpayOrderId: rzpOrder.id,
    amount: charge,
    currency: "INR",
  };
}

// ─── Expiry sweep (cron) ──────────────────────────────────────────────────────

export async function markExpiredSubscriptions() {
  const now = new Date();
  const expired = await prisma.organizationSubscription.findMany({
    where: { status: "ACTIVE", endDate: { lt: now } },
    include: { organization: { select: { id: true, name: true, slug: true, email: true } } },
  });
  if (expired.length === 0) return { expired: 0 };

  await prisma.$transaction([
    prisma.organizationSubscription.updateMany({
      where: { id: { in: expired.map((s) => s.id) } },
      data: { status: "EXPIRED" },
    }),
    prisma.organization.updateMany({
      where: { id: { in: expired.map((s) => s.organizationId) }, status: "ACTIVE" },
      data: { status: "EXPIRED" },
    }),
  ]);

  for (const sub of expired) {
    if (sub.organization.email) {
      sendOrgSubscriptionExpiredEmail(
        sub.organization.email,
        sub.organization.name,
        sub.organization.slug,
      ).catch(console.error);
    }
  }
  return { expired: expired.length };
}

// ─── Refunds (admin-initiated, full or partial) ───────────────────────────────

export async function refundOrgTransaction(
  orgTransactionId: string,
  opts: { amount?: number; reason: string; adminUserId: string },
) {
  const txn = await prisma.organizationTransaction.findUnique({
    where: { id: orgTransactionId },
    include: { subscription: true, organization: { select: { id: true, name: true } } },
  });
  if (!txn) throw new Error("Transaction not found");
  if (txn.status !== "PAID") throw new Error("Only PAID transactions can be refunded");
  if (!txn.razorpayPaymentId) throw new Error("Transaction has no Razorpay payment id");

  const paidAmount = Number(txn.amount);
  const refundAmount = opts.amount ?? paidAmount;
  if (refundAmount <= 0 || refundAmount > paidAmount) {
    throw new Error(`Refund amount must be between ₹1 and ₹${paidAmount}`);
  }
  const isFullRefund = refundAmount >= paidAmount;

  // Optimistic lock — only one refund attempt may be in flight.
  const locked = await prisma.organizationTransaction.updateMany({
    where: { id: txn.id, status: "PAID", refundStatus: null },
    data: { refundStatus: "PROCESSING", refundReason: opts.reason, refundAmount },
  });
  if (locked.count === 0) throw new Error("A refund for this transaction is already in progress or done");

  let razorpayRefundId: string;
  try {
    const razorpay = getRazorpay();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refund = await (razorpay.payments.refund as any)(txn.razorpayPaymentId, {
      amount: Math.round(refundAmount * 100),
      speed: "normal",
      notes: { orgTransactionId: txn.id, reason: opts.reason.slice(0, 200) },
    });
    razorpayRefundId = refund.id as string;
  } catch (err) {
    await prisma.organizationTransaction.update({
      where: { id: txn.id },
      data: { refundStatus: "FAILED" },
    });
    throw new Error(
      `Razorpay refund failed: ${err instanceof Error ? err.message : "unknown error"}. You can retry.`,
    );
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.organizationTransaction.update({
      where: { id: txn.id },
      data: {
        status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
        refundStatus: "PROCESSED",
        refundAmount,
        refundReason: opts.reason,
        refundedAt: now,
        refundedById: opts.adminUserId,
        razorpayRefundId,
      },
    });
    // Negative-flow ledger row for revenue reporting.
    await tx.organizationTransaction.create({
      data: {
        organizationId: txn.organizationId,
        subscriptionId: txn.subscriptionId,
        type: "REFUND",
        status: "PAID",
        amount: refundAmount,
        razorpayPaymentId: txn.razorpayPaymentId,
        paidByUserId: opts.adminUserId,
        notes: { refundOf: txn.id, reason: opts.reason },
      },
    });
    // Fully refunding the current period revokes access.
    if (isFullRefund && txn.subscription && txn.subscription.status === "ACTIVE") {
      await tx.organizationSubscription.update({
        where: { id: txn.subscription.id },
        data: { status: "CANCELLED", cancelledAt: now },
      });
      await tx.organization.update({
        where: { id: txn.organizationId },
        data: { status: "EXPIRED" },
      });
    }
  });

  return { refundAmount, isFullRefund, razorpayRefundId };
}

/** Retry after a FAILED Razorpay refund call — DB effects never ran. */
export async function retryOrgRefund(orgTransactionId: string, adminUserId: string) {
  const txn = await prisma.organizationTransaction.findUnique({
    where: { id: orgTransactionId },
    select: { refundStatus: true, refundAmount: true, refundReason: true },
  });
  if (!txn || txn.refundStatus !== "FAILED") throw new Error("Transaction is not in a failed refund state");

  // Reset the lock, then run the normal flow again.
  await prisma.organizationTransaction.update({
    where: { id: orgTransactionId },
    data: { refundStatus: null },
  });
  return refundOrgTransaction(orgTransactionId, {
    amount: txn.refundAmount ? Number(txn.refundAmount) : undefined,
    reason: txn.refundReason ?? "Refund retry",
    adminUserId,
  });
}

// ─── Billing queries ──────────────────────────────────────────────────────────

export async function getBillingSummary(organizationId: string) {
  const subscription = await prisma.organizationSubscription.findFirst({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });

  const pendingTxn = await prisma.organizationTransaction.findFirst({
    where: { organizationId, status: "PENDING", type: { in: ["SUBSCRIPTION", "RENEWAL", "UPGRADE"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true, type: true, amount: true, razorpayOrderId: true, createdAt: true },
  });

  return {
    subscription: subscription
      ? {
          id: subscription.id,
          status: subscription.status,
          billingCycle: subscription.billingCycle,
          amount: Number(subscription.amount),
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          plan: {
            id: subscription.plan.id,
            name: subscription.plan.name,
            maxStudents: subscription.plan.maxStudents,
            maxInstructors: subscription.plan.maxInstructors,
            maxCourses: subscription.plan.maxCourses,
          },
          pendingPlanId: subscription.pendingPlanId,
          pendingBillingCycle: subscription.pendingBillingCycle,
        }
      : null,
    pendingTransaction: pendingTxn
      ? { ...pendingTxn, amount: Number(pendingTxn.amount) }
      : null,
  };
}

export async function listOrgTransactions(
  organizationId: string,
  opts?: { page?: number; pageSize?: number; type?: OrgTransactionType },
) {
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = Math.min(100, opts?.pageSize ?? 20);

  const where = { organizationId, ...(opts?.type ? { type: opts.type } : {}) };
  const [items, total] = await Promise.all([
    prisma.organizationTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.organizationTransaction.count({ where }),
  ]);

  return {
    items: items.map((t) => ({
      ...t,
      amount: Number(t.amount),
      refundAmount: t.refundAmount ? Number(t.refundAmount) : null,
    })),
    total,
    page,
    pageSize,
  };
}
