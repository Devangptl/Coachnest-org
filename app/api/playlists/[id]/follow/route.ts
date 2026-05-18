/**
 * POST   /api/playlists/:id/follow — follow / save a public playlist
 * DELETE /api/playlists/:id/follow — unfollow
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { followPlaylist, unfollowPlaylist } from "@/services/playlist.service";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await followPlaylist(session.userId, id);
    return NextResponse.json({ ok: true, following: true });
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

  await unfollowPlaylist(session.userId, id);
  return NextResponse.json({ ok: true, following: false });
}
