/**
 * GET  /api/whiteboards/[id]/collaborators — list collaborators (viewers+).
 * POST /api/whiteboards/[id]/collaborators — add / update a collaborator (OWNER).
 */
import { NextRequest, NextResponse } from "next/server";
import { canManage, canView } from "@/lib/whiteboard/permissions";
import { getBoardRole } from "@/lib/whiteboard/guard";
import { addCollaboratorSchema } from "@/lib/validation/whiteboard";
import { addCollaborator, listCollaborators } from "@/services/whiteboard.service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { session, role } = await getBoardRole(id);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canView(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const collaborators = await listCollaborators(id);
  return NextResponse.json({ collaborators });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { session, role } = await getBoardRole(id);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = addCollaboratorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const collaborator = await addCollaborator(
    id,
    session.userId,
    parsed.data.userId,
    parsed.data.role,
  );
  return NextResponse.json({ collaborator }, { status: 201 });
}
