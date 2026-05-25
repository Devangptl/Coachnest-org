/**
 * GET    /api/classes/:id/assignments/:assignmentId   — fetch single assignment
 * PATCH  /api/classes/:id/assignments/:assignmentId   — update (owner/assistant)
 * DELETE /api/classes/:id/assignments/:assignmentId   — delete (owner/assistant)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  deleteAssignment,
  getAssignment,
  updateAssignment,
} from "@/services/assignment.service";
import { updateAssignmentSchema } from "@/lib/validation/assignment";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; assignmentId: string }> },
) {
  const { assignmentId } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const assignment = await getAssignment(assignmentId, session.userId);
    return NextResponse.json({ assignment });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    const status = msg.toLowerCase().includes("not found") ? 404 : 403;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; assignmentId: string }> },
) {
  const { assignmentId } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = updateAssignmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const assignment = await updateAssignment(
      assignmentId,
      session.userId,
      parsed.data,
    );
    return NextResponse.json({ assignment });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; assignmentId: string }> },
) {
  const { assignmentId } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await deleteAssignment(assignmentId, session.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
