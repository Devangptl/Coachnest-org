/**
 * POST /api/whiteboards/[id]/pages — add a page (editors+).
 */
import { NextRequest, NextResponse } from "next/server";
import { canEdit } from "@/lib/whiteboard/permissions";
import { getBoardRole } from "@/lib/whiteboard/guard";
import { createPageSchema } from "@/lib/validation/whiteboard";
import { createPage } from "@/services/whiteboard.service";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { session, role } = await getBoardRole(id);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parsed = createPageSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const page = await createPage(id, parsed.data.title);
  return NextResponse.json({ page }, { status: 201 });
}
