/**
 * GET /api/media          — list the current user's uploaded assets
 *   ?folder=courses       — filter by folder (optional)
 *   ?cursor=<id>          — pagination cursor (optional, for infinite scroll)
 *   ?limit=<n>            — page size, default 40
 *
 * Returns: { assets: MediaAsset[], nextCursor: string | null }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_FOLDERS = new Set(["avatars", "courses", "blogs", "misc"]);

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN" && session.role !== "INSTRUCTOR") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const folder = searchParams.get("folder");
  const cursor = searchParams.get("cursor");
  const limit  = Math.min(parseInt(searchParams.get("limit") ?? "40"), 100);

  const where = {
    userId: session.userId,
    ...(folder && ALLOWED_FOLDERS.has(folder) ? { folder } : {}),
  };

  const assets = await prisma.mediaAsset.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id:        true,
      url:       true,
      publicId:  true,
      folder:    true,
      filename:  true,
      bytes:     true,
      width:     true,
      height:    true,
      format:    true,
      createdAt: true,
    },
  });

  const hasMore    = assets.length > limit;
  const page       = hasMore ? assets.slice(0, limit) : assets;
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  return NextResponse.json({ assets: page, nextCursor });
}
