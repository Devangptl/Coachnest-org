/**
 * DELETE /api/playlists/:id/courses/:itemId — remove a course (owner/admin)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { removeCourseFromPlaylist } from "@/services/playlist.service";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; itemId: string }> },
) {
  const { id, itemId } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await removeCourseFromPlaylist(id, itemId, {
      userId: session.userId,
      role: session.role,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    const status =
      msg === "Forbidden" ? 403 : msg.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
