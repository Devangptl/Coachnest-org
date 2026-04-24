/**
 * PATCH  /api/highlights/:id — update color and/or note (owner only)
 * DELETE /api/highlights/:id — remove a specific highlight (owner only)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { color, note } = body as { color?: string; note?: string | null };

    const existing = await prisma.highlight.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Highlight not found." }, { status: 404 });
    }
    if (existing.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const data: { color?: string; note?: string | null } = {};
    if (typeof color === "string" && color) data.color = color;
    if (note === null || typeof note === "string") {
      data.note = note && note.trim() ? note.trim() : null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    const highlight = await prisma.highlight.update({ where: { id }, data });

    return NextResponse.json({ highlight });
  } catch (error) {
    console.error("[PATCH /api/highlights/:id]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;

    const highlight = await prisma.highlight.findUnique({ where: { id } });
    if (!highlight) {
      return NextResponse.json({ error: "Highlight not found." }, { status: 404 });
    }
    if (highlight.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    await prisma.highlight.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/highlights/:id]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
