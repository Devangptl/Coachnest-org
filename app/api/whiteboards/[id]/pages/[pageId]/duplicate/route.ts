/**
 * POST /api/whiteboards/[id]/pages/[pageId]/duplicate — clone a page (editors+).
 */
import { NextRequest, NextResponse } from "next/server";
import { canEdit } from "@/lib/whiteboard/permissions";
import { getBoardRole, pageBelongsToBoard } from "@/lib/whiteboard/guard";
import { duplicatePage } from "@/services/whiteboard.service";

type Ctx = { params: Promise<{ id: string; pageId: string }> };

export async function POST(_req: NextRequest, ctx: Ctx) {
  const { id, pageId } = await ctx.params;
  const { session, role } = await getBoardRole(id);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await pageBelongsToBoard(id, pageId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const page = await duplicatePage(id, pageId);
    return NextResponse.json({ page }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to duplicate page";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
