/**
 * GET /api/courses/:id/activity — recent activity log for a course.
 * Only collaborators with at least VIEWER access (or an admin) can read it.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getCollaboratorPermission,
  getCourseActivityLog,
} from "@/services/collaboration.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  if (session.role !== "ADMIN") {
    const perm = await getCollaboratorPermission(id, session.userId);
    if (!perm) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 100), 200);
  const events = await getCourseActivityLog(id, limit);
  return NextResponse.json({ events });
}
