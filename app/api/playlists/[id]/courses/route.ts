/**
 * GET   /api/playlists/:id/courses  — paginated items (for infinite scroll)
 * POST  /api/playlists/:id/courses  — add a course (owner/admin)
 * PATCH /api/playlists/:id/courses  — reorder items (owner/admin)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  addCourseToPlaylist,
  reorderPlaylistItems,
} from "@/services/playlist.service";
import {
  addPlaylistCourseSchema,
  reorderPlaylistSchema,
} from "@/lib/validation/playlist";

const PER_PAGE = 20;

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const session = await getSession();

  const playlist = await prisma.coursePlaylist.findUnique({
    where: { id },
    select: { id: true, ownerId: true, visibility: true },
  });
  if (!playlist) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canManage =
    !!session &&
    (playlist.ownerId === session.userId || session.role === "ADMIN");
  if (playlist.visibility !== "PUBLIC" && !canManage) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [items, total] = await Promise.all([
    prisma.coursePlaylistItem.findMany({
      where: { playlistId: id },
      orderBy: { order: "asc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnail: true,
            level: true,
            isFree: true,
            price: true,
            discountPrice: true,
            totalLessons: true,
            totalDuration: true,
            status: true,
            createdBy: { select: { name: true } },
          },
        },
      },
    }),
    prisma.coursePlaylistItem.count({ where: { playlistId: id } }),
  ]);

  return NextResponse.json({
    items: items.map((it) => ({
      id: it.id,
      order: it.order,
      course: {
        ...it.course,
        price: it.course.price ? Number(it.course.price) : null,
        discountPrice: it.course.discountPrice
          ? Number(it.course.discountPrice)
          : null,
      },
    })),
    total,
    page,
    hasMore: page * PER_PAGE < total,
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = addPlaylistCourseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const item = await addCourseToPlaylist(
      id,
      { userId: session.userId, role: session.role },
      parsed.data.courseId,
    );
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    const status =
      msg === "Forbidden" ? 403 : msg.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = reorderPlaylistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    await reorderPlaylistItems(
      id,
      { userId: session.userId, role: session.role },
      parsed.data.items,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    const status = msg === "Playlist not found" ? 404 : 403;
    return NextResponse.json({ error: msg }, { status });
  }
}
