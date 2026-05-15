import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { regenerateInviteCode } from "@/services/class.service";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const cls = await regenerateInviteCode(id, session.userId);
    return NextResponse.json({ inviteCode: cls.inviteCode });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
