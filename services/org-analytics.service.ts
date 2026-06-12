/**
 * Organization analytics — platform-level subscription revenue reporting and
 * org-scoped dashboards. Mirrors analytics.service.ts conventions: plain
 * serializable return values, optional month windows.
 */
import { prisma } from "@/lib/prisma";

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function lastMonths(months: number): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: monthKey(d),
      label: d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
    });
  }
  return out;
}

// ─── Platform-level (admin) ───────────────────────────────────────────────────

export async function getPlatformOrgStats() {
  const [orgsByStatus, activeSubs, paidAgg, refundAgg, txnCount] = await Promise.all([
    prisma.organization.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.organizationSubscription.count({ where: { status: "ACTIVE" } }),
    prisma.organizationTransaction.aggregate({
      where: { status: { in: ["PAID", "PARTIALLY_REFUNDED"] }, type: { not: "REFUND" } },
      _sum: { amount: true },
    }),
    prisma.organizationTransaction.aggregate({
      where: { type: "REFUND", status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.organizationTransaction.count(),
  ]);

  const counts = Object.fromEntries(orgsByStatus.map((r) => [r.status, r._count._all]));
  const grossRevenue = Number(paidAgg._sum.amount ?? 0);
  const refunds = Number(refundAgg._sum.amount ?? 0);

  return {
    totalOrganizations: orgsByStatus.reduce((a, r) => a + r._count._all, 0),
    activeOrganizations: counts["ACTIVE"] ?? 0,
    expiredOrganizations: counts["EXPIRED"] ?? 0,
    pendingOrganizations: counts["PENDING"] ?? 0,
    suspendedOrganizations: counts["SUSPENDED"] ?? 0,
    activeSubscriptions: activeSubs,
    grossRevenue,
    refunds,
    netRevenue: grossRevenue - refunds,
    transactionCount: txnCount,
  };
}

export async function getOrgRevenueByOrg(limit = 20) {
  const [paid, refunded] = await Promise.all([
    prisma.organizationTransaction.groupBy({
      by: ["organizationId"],
      where: { status: { in: ["PAID", "PARTIALLY_REFUNDED"] }, type: { not: "REFUND" } },
      _sum: { amount: true },
    }),
    prisma.organizationTransaction.groupBy({
      by: ["organizationId"],
      where: { type: "REFUND", status: "PAID" },
      _sum: { amount: true },
    }),
  ]);
  const refundMap = new Map(refunded.map((r) => [r.organizationId, Number(r._sum.amount ?? 0)]));

  const rows = paid
    .map((r) => {
      const gross = Number(r._sum.amount ?? 0);
      const refunds = refundMap.get(r.organizationId) ?? 0;
      return { organizationId: r.organizationId, gross, refunds, net: gross - refunds };
    })
    .sort((a, b) => b.net - a.net)
    .slice(0, limit);

  const orgs = await prisma.organization.findMany({
    where: { id: { in: rows.map((r) => r.organizationId) } },
    select: { id: true, name: true, slug: true, status: true },
  });
  const orgMap = new Map(orgs.map((o) => [o.id, o]));

  return rows.map((r) => ({
    ...r,
    name: orgMap.get(r.organizationId)?.name ?? "Unknown",
    slug: orgMap.get(r.organizationId)?.slug ?? "",
    status: orgMap.get(r.organizationId)?.status ?? "EXPIRED",
  }));
}

export async function getOrgMonthlyRevenue(months = 6) {
  const buckets = lastMonths(months);
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const txns = await prisma.organizationTransaction.findMany({
    where: { createdAt: { gte: since }, status: { in: ["PAID", "PARTIALLY_REFUNDED"] } },
    select: { amount: true, type: true, createdAt: true },
  });

  return buckets.map(({ key, label }) => {
    let revenue = 0;
    let refunds = 0;
    for (const t of txns) {
      if (monthKey(t.createdAt) !== key) continue;
      if (t.type === "REFUND") refunds += Number(t.amount);
      else revenue += Number(t.amount);
    }
    return { month: label, revenue, refunds, net: revenue - refunds };
  });
}

export async function getOrgSubscriptionBreakdown() {
  const subs = await prisma.organizationSubscription.groupBy({
    by: ["planId", "billingCycle"],
    where: { status: "ACTIVE" },
    _count: { _all: true },
    _sum: { amount: true },
  });
  const plans = await prisma.subscriptionPlan.findMany({
    where: { id: { in: [...new Set(subs.map((s) => s.planId))] } },
    select: { id: true, name: true },
  });
  const planMap = new Map(plans.map((p) => [p.id, p.name]));

  return subs.map((s) => ({
    planId: s.planId,
    planName: planMap.get(s.planId) ?? "Unknown",
    billingCycle: s.billingCycle,
    count: s._count._all,
    revenue: Number(s._sum.amount ?? 0),
  }));
}

export async function getOrgUserGrowth(months = 6) {
  const buckets = lastMonths(months);
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const members = await prisma.organizationMember.findMany({
    where: { joinedAt: { gte: since } },
    select: { joinedAt: true },
  });

  return buckets.map(({ key, label }) => ({
    month: label,
    members: members.filter((m) => monthKey(m.joinedAt) === key).length,
  }));
}

export async function getOrgCourseUsage(limit = 20) {
  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      _count: { select: { courses: true, members: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const enrollments = await prisma.enrollment.groupBy({
    by: ["courseId"],
    where: { course: { organizationId: { in: orgs.map((o) => o.id) } } },
    _count: { _all: true },
  });
  const courseOrg = await prisma.course.findMany({
    where: { id: { in: enrollments.map((e) => e.courseId) } },
    select: { id: true, organizationId: true },
  });
  const courseToOrg = new Map(courseOrg.map((c) => [c.id, c.organizationId]));
  const enrollByOrg = new Map<string, number>();
  for (const e of enrollments) {
    const orgId = courseToOrg.get(e.courseId);
    if (orgId) enrollByOrg.set(orgId, (enrollByOrg.get(orgId) ?? 0) + e._count._all);
  }

  return orgs.map((o) => ({
    organizationId: o.id,
    name: o.name,
    slug: o.slug,
    status: o.status,
    courses: o._count.courses,
    members: o._count.members,
    enrollments: enrollByOrg.get(o.id) ?? 0,
  }));
}

// ─── Org-scoped (org admin dashboard & reports) ───────────────────────────────

export async function getOrgDashboardStats(organizationId: string) {
  const [students, instructors, admins, courses, publishedCourses, enrollAgg, completed] =
    await Promise.all([
      prisma.organizationMember.count({ where: { organizationId, role: "ORG_STUDENT" } }),
      prisma.organizationMember.count({ where: { organizationId, role: "ORG_INSTRUCTOR" } }),
      prisma.organizationMember.count({ where: { organizationId, role: "ORG_ADMIN" } }),
      prisma.course.count({ where: { organizationId } }),
      prisma.course.count({ where: { organizationId, status: "PUBLISHED" } }),
      prisma.enrollment.count({ where: { course: { organizationId } } }),
      prisma.enrollment.count({
        where: { course: { organizationId }, completedAt: { not: null } },
      }),
    ]);

  return {
    studentCount: students,
    instructorCount: instructors,
    adminCount: admins,
    courseCount: courses,
    publishedCourseCount: publishedCourses,
    enrollmentCount: enrollAgg,
    completedEnrollments: completed,
  };
}

export async function getOrgCourseCompletion(organizationId: string) {
  const courses = await prisma.course.findMany({
    where: { organizationId },
    select: {
      id: true,
      title: true,
      status: true,
      enrollments: { select: { completedAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return courses.map((c) => {
    const total = c.enrollments.length;
    const completed = c.enrollments.filter((e) => e.completedAt).length;
    return {
      courseId: c.id,
      title: c.title,
      status: c.status,
      enrollments: total,
      completed,
      completionRate: total === 0 ? 0 : Math.round((completed / total) * 100),
    };
  });
}

export async function getOrgEnrollmentTrends(organizationId: string, months = 6) {
  const buckets = lastMonths(months);
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const enrollments = await prisma.enrollment.findMany({
    where: { course: { organizationId }, enrolledAt: { gte: since } },
    select: { enrolledAt: true },
  });

  return buckets.map(({ key, label }) => ({
    month: label,
    enrollments: enrollments.filter((e) => monthKey(e.enrolledAt) === key).length,
  }));
}
