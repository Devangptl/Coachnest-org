/**
 * PATCH  /api/whiteboards/[id]/pages/[pageId] — rename / update appState (editors+).
 * DELETE /api/whiteboards/[id]/pages/[pageId] — delete a page (editors+).
 */
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { canEdit } from "@/lib/whiteboard/permissions";
import { getBoardRole, pageBelongsToBoard } from "@/lib/whiteboard/guard";
import { updatePageSchema } from "@/lib/validation/whiteboard";
import { deletePage, updatePage } from "@/services/whiteboard.service";

type Ctx = { params: Promise<{ id: string; pageId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id, pageId } = await ctx.params;
  const { session, role } = await getBoardRole(id);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await pageBelongsToBoard(id, pageId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updatePageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const page = await updatePage(pageId, {
    title: parsed.data.title,
    appState: parsed.data.appState as Prisma.InputJsonValue | undefined,
  });
  return NextResponse.json({ page });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id, pageId } = await ctx.params;
  const { session, role } = await getBoardRole(id);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await pageBelongsToBoard(id, pageId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await deletePage(id, pageId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete page";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
