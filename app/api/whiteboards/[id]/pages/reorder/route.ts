/**
 * PATCH /api/whiteboards/[id]/pages/reorder — set page order (editors+).
 */
import { NextRequest, NextResponse } from "next/server";
import { canEdit } from "@/lib/whiteboard/permissions";
import { getBoardRole } from "@/lib/whiteboard/guard";
import { reorderPagesSchema } from "@/lib/validation/whiteboard";
import { reorderPages } from "@/services/whiteboard.service";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { session, role } = await getBoardRole(id);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = reorderPagesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  await reorderPages(id, parsed.data.pageIds);
  return NextResponse.json({ ok: true });
}
