/**
 * GET    /api/admin/email-logs/[id] — get single email log
 * DELETE /api/admin/email-logs/[id] — delete log entry
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const log = await prisma.emailLog.findUnique({
      where: { id },
      include: { template: true },
    });

    if (!log) {
      return NextResponse.json({ error: "Log entry not found" }, { status: 404 });
    }

    return NextResponse.json({ log });
  } catch (err) {
    console.error("[GET /api/admin/email-logs/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    await prisma.emailLog.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/admin/email-logs/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
