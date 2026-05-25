/**
 * POST /api/classes/:id/discussions/:discussionId/vote
 *   • Toggle upvote — returns the new state.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { toggleDiscussionVote } from "@/services/class.service";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; discussionId: string }> },
) {
  const { id, discussionId } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await toggleDiscussionVote(id, discussionId, session.userId);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
