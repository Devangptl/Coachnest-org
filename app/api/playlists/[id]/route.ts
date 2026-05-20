/**
 * GET    /api/playlists/:id  — playlist meta (respects visibility)
 * PATCH  /api/playlists/:id  — update details (owner/admin)
 * DELETE /api/playlists/:id  — delete (owner/admin)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  deletePlaylist,
  playlistDurations,
  updatePlaylist,
} from "@/services/playlist.service";
import { updatePlaylistSchema } from "@/lib/validation/playlist";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();

  const playlist = await prisma.coursePlaylist.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, avatar: true, headline: true } },
      _count: { select: { items: true, followers: true } },
    },
  });
  if (!playlist) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canManage =
    !!session &&
    (playlist.ownerId === session.userId || session.role === "ADMIN");

  if (playlist.visibility !== "PUBLIC" && !canManage) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const durations = await playlistDurations([id]);
  const isFollowing = session
    ? !!(await prisma.coursePlaylistFollow.findUnique({
        where: { userId_playlistId: { userId: session.userId, playlistId: id } },
      }))
    : false;

  return NextResponse.json({
    playlist: { ...playlist, totalDuration: durations.get(id) ?? 0 },
    canManage,
    isFollowing,
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = updatePlaylistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const playlist = await updatePlaylist(
      id,
      { userId: session.userId, role: session.role },
      parsed.data,
    );
    return NextResponse.json({ playlist });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    const status = msg === "Playlist not found" ? 404 : 403;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await deletePlaylist(id, { userId: session.userId, role: session.role });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    const status = msg === "Playlist not found" ? 404 : 403;
    return NextResponse.json({ error: msg }, { status });
  }
}
