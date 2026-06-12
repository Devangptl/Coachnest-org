/**
 * GET /api/whiteboards/[id]/pages/[pageId]/elements — hydrate a page (viewers+).
 * PUT /api/whiteboards/[id]/pages/[pageId]/elements — debounced incremental save
 *     of changed/deleted elements, reconciled by version (editors+).
 */
import { NextRequest, NextResponse } from "next/server";
import { canEdit, canView } from "@/lib/whiteboard/permissions";
import { getBoardRole, pageBelongsToBoard } from "@/lib/whiteboard/guard";
import { syncElementsSchema } from "@/lib/validation/whiteboard";
import { getPageElements, syncElements } from "@/services/whiteboard.service";

type Ctx = { params: Promise<{ id: string; pageId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id, pageId } = await ctx.params;
  const { session, role } = await getBoardRole(id);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canView(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await pageBelongsToBoard(id, pageId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const elements = await getPageElements(pageId);
  return NextResponse.json({ elements });
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id, pageId } = await ctx.params;
  const { session, role } = await getBoardRole(id);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await pageBelongsToBoard(id, pageId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = syncElementsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await syncElements(pageId, session.userId, parsed.data);
  return NextResponse.json(result);
}
