/**
 * GET /api/admin/organizations — list organizations with member counts,
 * current subscription, and net revenue. SUPER_ADMIN / FINANCE_ADMIN.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrgRevenueByOrg } from "@/services/org-analytics.service";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (
      !session ||
      session.role !== "ADMIN" ||
      !["SUPER_ADMIN", "FINANCE_ADMIN"].includes(session.adminSubRole ?? "SUPER_ADMIN")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const search = req.nextUrl.searchParams.get("search") ?? undefined;
    const status = req.nextUrl.searchParams.get("status") ?? undefined;

    const [orgs, revenue] = await Promise.all([
      prisma.organization.findMany({
        where: {
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { slug: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
          ...(status && ["PENDING", "ACTIVE", "SUSPENDED", "EXPIRED"].includes(status)
            ? { status: status as "PENDING" | "ACTIVE" | "SUSPENDED" | "EXPIRED" }
            : {}),
        },
        include: {
          _count: { select: { members: true, courses: true } },
          subscriptions: {
            where: { status: { in: ["ACTIVE", "EXPIRED", "PENDING"] } },
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { plan: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      getOrgRevenueByOrg(1000),
    ]);

    const revenueMap = new Map(revenue.map((r) => [r.organizationId, r.net]));

    return NextResponse.json({
      organizations: orgs.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        email: o.email,
        status: o.status,
        createdAt: o.createdAt,
        members: o._count.members,
        courses: o._count.courses,
        plan: o.subscriptions[0]?.plan.name ?? null,
        billingCycle: o.subscriptions[0]?.billingCycle ?? null,
        subscriptionStatus: o.subscriptions[0]?.status ?? null,
        endDate: o.subscriptions[0]?.endDate ?? null,
        netRevenue: revenueMap.get(o.id) ?? 0,
      })),
    });
  } catch (error) {
    console.error("[GET /api/admin/organizations]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
