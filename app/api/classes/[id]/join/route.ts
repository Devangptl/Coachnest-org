import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { joinClass } from "@/services/class.service";
import { joinClassSchema } from "@/lib/validation/class";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = joinClassSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const enrollment = await joinClass(session.userId, id, parsed.data.inviteCode);
    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
