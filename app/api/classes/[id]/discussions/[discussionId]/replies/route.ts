/**
 * POST /api/classes/:id/discussions/:discussionId/replies
 *   • Any class member can reply.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { replyToDiscussion } from "@/services/class.service";
import { discussionReplySchema } from "@/lib/validation/class";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; discussionId: string }> },
) {
  const { id, discussionId } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = discussionReplySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const reply = await replyToDiscussion(
      id,
      discussionId,
      session.userId,
      parsed.data.body,
    );
    return NextResponse.json({ reply }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
