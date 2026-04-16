/**
 * GET /api/community/feed — aggregated activity feed
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const limit = 30;

    const [events, total] = await Promise.all([
      prisma.activityFeedEvent.findMany({
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.activityFeedEvent.count(),
    ]);

    return NextResponse.json(
      { events, total, page, totalPages: Math.ceil(total / limit) },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (err) {
    console.error("[GET /api/community/feed]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
