/**
 * GET  /api/playlists  — browse public playlists, or scope=mine | following
 * POST /api/playlists  — create a playlist (instructor/admin only)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createPlaylist, playlistDurations } from "@/services/playlist.service";
import { createPlaylistSchema } from "@/lib/validation/playlist";

const cardInclude = {
  owner: { select: { id: true, name: true, avatar: true } },
  _count: { select: { items: true, followers: true } },
} as const;

async function withDurations<T extends { id: string }>(playlists: T[]) {
  const durations = await playlistDurations(playlists.map((p) => p.id));
  return playlists.map((p) => ({ ...p, totalDuration: durations.get(p.id) ?? 0 }));
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope");
  const session = await getSession();

  if (scope === "mine") {
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const playlists = await prisma.coursePlaylist.findMany({
      where: { ownerId: session.userId },
      include: cardInclude,
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ playlists: await withDurations(playlists) });
  }

  if (scope === "following") {
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const follows = await prisma.coursePlaylistFollow.findMany({
      where: { userId: session.userId },
      include: { playlist: { include: cardInclude } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      playlists: await withDurations(follows.map((f) => f.playlist)),
    });
  }

  const q = url.searchParams.get("q")?.trim();
  const sort = url.searchParams.get("sort") ?? "newest";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const perPage = 24;

  const where = {
    visibility: "PUBLIC" as const,
    ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const orderBy =
    sort === "popular"
      ? ({ followers: { _count: "desc" } } as const)
      : sort === "largest"
        ? ({ items: { _count: "desc" } } as const)
        : ({ createdAt: "desc" } as const);

  const [playlists, total] = await Promise.all([
    prisma.coursePlaylist.findMany({
      where,
      include: cardInclude,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.coursePlaylist.count({ where }),
  ]);

  return NextResponse.json({
    playlists: await withDurations(playlists),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    hasMore: page * perPage < total,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "INSTRUCTOR" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createPlaylistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const playlist = await createPlaylist(session.userId, parsed.data);
    return NextResponse.json({ playlist }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create playlist";
    if (msg.includes("own courses") || msg === "Course not found") {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error("[POST /api/playlists]", err);
    return NextResponse.json({ error: "Failed to create playlist" }, { status: 500 });
  }
}
