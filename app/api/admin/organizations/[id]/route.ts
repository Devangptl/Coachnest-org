/**
 * GET   /api/admin/organizations/[id] — org detail (members, subscriptions, transactions)
 * PATCH /api/admin/organizations/[id] — suspend / reactivate
 * SUPER_ADMIN / FINANCE_ADMIN.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { setOrganizationStatus } from "@/services/organization.service";

type Params = { params: Promise<{ id: string }> };

async function requireFinanceAdmin() {
  const session = await getSession();
  if (
    !session ||
    session.role !== "ADMIN" ||
    !["SUPER_ADMIN", "FINANCE_ADMIN"].includes(session.adminSubRole ?? "SUPER_ADMIN")
  ) {
    return null;
  }
  return session;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireFinanceAdmin();
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { joinedAt: "desc" },
        },
        courses: {
          select: {
            id: true,
            title: true,
            status: true,
            _count: { select: { enrollments: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        subscriptions: {
          include: { plan: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
        transactions: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    });
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    return NextResponse.json({
      organization: {
        ...org,
        transactions: org.transactions.map((t) => ({
          ...t,
          amount: Number(t.amount),
          refundAmount: t.refundAmount ? Number(t.refundAmount) : null,
        })),
        subscriptions: org.subscriptions.map((s) => ({ ...s, amount: Number(s.amount) })),
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/organizations/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const patchSchema = z.object({ status: z.enum(["ACTIVE", "SUSPENDED"]) });

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireFinanceAdmin();
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const org = await setOrganizationStatus(id, parsed.data.status);
    return NextResponse.json({ organization: { id: org.id, status: org.status } });
  } catch (error) {
    console.error("[PATCH /api/admin/organizations/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
