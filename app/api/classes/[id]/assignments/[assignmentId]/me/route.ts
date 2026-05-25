/**
 * GET /api/classes/:id/assignments/:assignmentId/me
 *   • The current student's submissions (all attempts) for this assignment.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMySubmission } from "@/services/assignment.service";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; assignmentId: string }> },
) {
  const { assignmentId } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const submissions = await getMySubmission(assignmentId, session.userId);
    return NextResponse.json({ submissions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
