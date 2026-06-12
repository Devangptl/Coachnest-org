/**
 * PATCH  /api/whiteboards/[id]/collaborators/[userId] — change role (OWNER).
 * DELETE /api/whiteboards/[id]/collaborators/[userId] — remove (OWNER).
 */
import { NextRequest, NextResponse } from "next/server";
import { canManage } from "@/lib/whiteboard/permissions";
import { getBoardRole } from "@/lib/whiteboard/guard";
import { updateCollaboratorSchema } from "@/lib/validation/whiteboard";
import { removeCollaborator, updateCollaboratorRole } from "@/services/whiteboard.service";

type Ctx = { params: Promise<{ id: string; userId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id, userId } = await ctx.params;
  const { session, role } = await getBoardRole(id);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = updateCollaboratorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const collaborator = await updateCollaboratorRole(id, userId, parsed.data.role);
  return NextResponse.json({ collaborator });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id, userId } = await ctx.params;
  const { session, role } = await getBoardRole(id);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await removeCollaborator(id, userId);
  return NextResponse.json({ ok: true });
}
