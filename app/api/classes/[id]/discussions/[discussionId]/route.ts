/**
 * GET    /api/classes/:id/discussions/:discussionId — full thread (with replies)
 * PATCH  /api/classes/:id/discussions/:discussionId — edit / pin / resolve / accept reply
 * DELETE /api/classes/:id/discussions/:discussionId — delete
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  deleteDiscussion,
  getDiscussionThread,
  updateDiscussion,
} from "@/services/class.service";
import { discussionUpdateSchema } from "@/lib/validation/class";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; discussionId: string }> },
) {
  const { id, discussionId } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const thread = await getDiscussionThread(id, discussionId, session.userId);
    // Shape: replace votes arrays with counts + myVote flags.
    const shape = (d: { votes: Array<{ userId: string }> }) => ({
      voteCount: d.votes.length,
      myVote: d.votes.some((v) => v.userId === session.userId),
    });
    const rootShape = shape(thread);
    const repliesShaped = thread.replies.map((r) => {
      const { votes, ...rest } = r;
      return { ...rest, ...shape({ votes }) };
    });
    const { votes, replies, ...rest } = thread;
    return NextResponse.json({
      discussion: { ...rest, ...rootShape, replies: repliesShaped },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    const status = msg.toLowerCase().includes("not found") ? 404 : 403;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; discussionId: string }> },
) {
  const { id, discussionId } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = discussionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const updated = await updateDiscussion(
      id,
      discussionId,
      session.userId,
      parsed.data,
    );
    return NextResponse.json({ discussion: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; discussionId: string }> },
) {
  const { id, discussionId } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await deleteDiscussion(id, discussionId, session.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
