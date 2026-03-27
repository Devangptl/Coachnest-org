/**
 * GET    /api/admin/contact/[id] — get single message
 * PATCH  /api/admin/contact/[id] — update status
 * DELETE /api/admin/contact/[id] — delete message
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

// ─── GET: single message ─────────────────────────────────────────────────────

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "INSTRUCTOR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const msg = await prisma.contactMessage.findUnique({ where: { id } });
    if (!msg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Auto-mark as READ when viewed
    if (msg.status === "UNREAD") {
      await prisma.contactMessage.update({
        where: { id },
        data: { status: "READ" },
      });
      msg.status = "READ";
    }

    return NextResponse.json({ message: msg });
  } catch (err) {
    console.error("[GET /api/admin/contact/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── PATCH: update status ────────────────────────────────────────────────────

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "INSTRUCTOR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const body = await req.json();
    const { status } = body;

    if (!status || !["UNREAD", "READ", "REPLIED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updated = await prisma.contactMessage.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ message: updated });
  } catch (err) {
    console.error("[PATCH /api/admin/contact/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── DELETE: remove message ──────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    await prisma.contactMessage.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/admin/contact/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
