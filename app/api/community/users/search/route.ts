/**
 * GET /api/community/users/search?q=… — typeahead for @mentions.
 * Returns up to 8 users whose name matches. Auth required.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const q = req.nextUrl.searchParams.get("q")?.trim() || "";
    if (q.length < 1) return NextResponse.json({ users: [] });

    const users = await prisma.user.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true, avatar: true },
      take: 8,
      orderBy: { name: "asc" },
    });
    return NextResponse.json(
      { users },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[GET /api/community/users/search]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
