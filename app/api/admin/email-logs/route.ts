/**
 * GET /api/admin/email-logs — list email logs with filtering and pagination
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50")));
    const status = searchParams.get("status") ?? undefined;
    const templateId = searchParams.get("templateId") ?? undefined;
    const search = searchParams.get("search") ?? undefined;

    const where = {
      ...(status && { status: status as "SENT" | "FAILED" | "PENDING" }),
      ...(templateId && { templateId }),
      ...(search && {
        OR: [
          { to: { contains: search, mode: "insensitive" as const } },
          { subject: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { sentAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          template: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.emailLog.count({ where }),
    ]);

    const stats = await prisma.emailLog.groupBy({
      by: ["status"],
      _count: { status: true },
    });

    return NextResponse.json({
      logs,
      total,
      page,
      pages: Math.ceil(total / limit),
      stats: Object.fromEntries(stats.map((s) => [s.status, s._count.status])),
    });
  } catch (err) {
    console.error("[GET /api/admin/email-logs]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
