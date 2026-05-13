import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { endLiveSession, startLiveSession } from "@/services/class.service";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; sessionId: string }> },
) {
  const { sessionId } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, recordingUrl } = await req.json().catch(() => ({}));

  try {
    const updated = action === "end"
      ? await endLiveSession(sessionId, session.userId, recordingUrl)
      : await startLiveSession(sessionId, session.userId);
    return NextResponse.json({ session: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
