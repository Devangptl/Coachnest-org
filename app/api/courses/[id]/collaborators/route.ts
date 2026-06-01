/**
 * GET  /api/courses/:id/collaborators  — list collaborators + pending invites
 * POST /api/courses/:id/collaborators  — invite a new collaborator by email
 *
 * Only the course owner (or an admin) can manage collaborators.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  canManageCollaborators,
  getCourseCollaborators,
  getCoursePendingInvites,
  inviteCollaborator,
  getRevenueShareTotal,
} from "@/services/collaboration.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const isAdmin = session.role === "ADMIN";
  const canManage = isAdmin || (await canManageCollaborators(id, session.userId));

  const [collaborators, pendingInvites, revenueShareTotal] = await Promise.all([
    getCourseCollaborators(id),
    canManage ? getCoursePendingInvites(id) : Promise.resolve([]),
    getRevenueShareTotal(id),
  ]);

  return NextResponse.json({
    collaborators,
    pendingInvites,
    revenueShareTotal,
    canManage,
  });
}

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["CO_INSTRUCTOR", "EDITOR", "VIEWER"]),
  revenueShare: z.number().min(0).max(100),
  message: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const isAdmin = session.role === "ADMIN";
  const allowed = isAdmin || (await canManageCollaborators(id, session.userId));
  if (!allowed) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  let body;
  try {
    body = inviteSchema.parse(await req.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues[0]?.message : "Invalid request body.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Reject splits that would push the total over 100%.
  const currentTotal = await getRevenueShareTotal(id);
  if (currentTotal + body.revenueShare > 100) {
    return NextResponse.json(
      {
        error: `Revenue share would exceed 100% (already allocated: ${currentTotal}%, requested: ${body.revenueShare}%).`,
      },
      { status: 400 },
    );
  }

  try {
    const invite = await inviteCollaborator({
      courseId: id,
      email: body.email,
      role: body.role,
      revenueShare: body.revenueShare,
      invitedById: session.userId,
      message: body.message,
    });
    return NextResponse.json({ invite }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send invite.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
