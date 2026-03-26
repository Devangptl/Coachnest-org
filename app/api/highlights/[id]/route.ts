/**
 * DELETE /api/highlights/:id — remove a specific highlight (owner only)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

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

    // Verify ownership
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
