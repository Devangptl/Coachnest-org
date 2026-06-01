/**
 * POST   /api/collaboration/invites/:token  — accept an invite
 * DELETE /api/collaboration/invites/:token  — decline an invite
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { acceptInvite, declineInvite } from "@/services/collaboration.service";

type Params = { params: Promise<{ token: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { token } = await params;
  try {
    const result = await acceptInvite(token, session.userId);
    return NextResponse.json({ ok: true, courseId: result.courseId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to accept invite.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { token } = await params;
  try {
    await declineInvite(token, session.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to decline invite.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
