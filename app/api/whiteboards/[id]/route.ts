/**
 * GET    /api/whiteboards/[id] — full board payload + the caller's role.
 * PATCH  /api/whiteboards/[id] — rename / change default role (OWNER only).
 * DELETE /api/whiteboards/[id] — delete the board (OWNER only).
 */
import { NextRequest, NextResponse } from "next/server";
import { canManage, canView } from "@/lib/whiteboard/permissions";
import { getBoardRole } from "@/lib/whiteboard/guard";
import { updateWhiteboardSchema } from "@/lib/validation/whiteboard";
import {
  deleteWhiteboard,
  getWhiteboardForUser,
  updateWhiteboard,
} from "@/services/whiteboard.service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { session, role } = await getBoardRole(id);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canView(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const whiteboard = await getWhiteboardForUser(id);
  if (!whiteboard) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ whiteboard, role });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { session, role } = await getBoardRole(id);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = updateWhiteboardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const whiteboard = await updateWhiteboard(id, parsed.data);
  return NextResponse.json({ whiteboard });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { session, role } = await getBoardRole(id);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await deleteWhiteboard(id);
  return NextResponse.json({ ok: true });
}
