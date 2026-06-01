/**
 * GET /api/collaboration/invites — list pending collaboration invites for the
 * authenticated user (matched by email).
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMyPendingInvites } from "@/services/collaboration.service";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const invites = await getMyPendingInvites(session.email);
  return NextResponse.json({ invites });
}
