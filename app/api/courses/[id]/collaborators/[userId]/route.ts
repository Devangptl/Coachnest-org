/**
 * PATCH  /api/courses/:id/collaborators/:userId  — update role / revenueShare / isPublic
 * DELETE /api/courses/:id/collaborators/:userId  — remove a collaborator
 *
 * The `:userId` can also be the literal "invite:<inviteId>" to revoke a
 * pending invite (DELETE only).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  canManageCollaborators,
  getRevenueShareTotal,
  removeCollaborator,
  revokeInvite,
  updateCollaborator,
} from "@/services/collaboration.service";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string; userId: string }> };

const patchSchema = z.object({
  role: z.enum(["CO_INSTRUCTOR", "EDITOR", "VIEWER"]).optional(),
  revenueShare: z.number().min(0).max(100).optional(),
  isPublic: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id, userId } = await params;
  const isAdmin = session.role === "ADMIN";
  const allowed = isAdmin || (await canManageCollaborators(id, session.userId));
  if (!allowed) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  let body;
  try {
    body = patchSchema.parse(await req.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues[0]?.message : "Invalid body.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (body.revenueShare !== undefined) {
    const existing = await prisma.courseCollaborator.findUnique({
      where: { courseId_userId: { courseId: id, userId } },
      select: { revenueShare: true },
    });
    const currentTotal = await getRevenueShareTotal(id);
    const proposedTotal = currentTotal - Number(existing?.revenueShare ?? 0) + body.revenueShare;
    if (proposedTotal > 100) {
      return NextResponse.json(
        { error: `Revenue share would exceed 100% (proposed total: ${proposedTotal}%).` },
        { status: 400 },
      );
    }
  }

  try {
    const updated = await updateCollaborator({
      courseId: id,
      userId,
      actorId: session.userId,
      ...body,
    });
    return NextResponse.json({ collaborator: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update collaborator.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id, userId } = await params;
  const isAdmin = session.role === "ADMIN";
  const allowed = isAdmin || (await canManageCollaborators(id, session.userId));
  if (!allowed) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  try {
    if (userId.startsWith("invite:")) {
      const inviteId = userId.slice("invite:".length);
      await revokeInvite(inviteId, session.userId);
    } else {
      await removeCollaborator(id, userId, session.userId);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to remove collaborator.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
