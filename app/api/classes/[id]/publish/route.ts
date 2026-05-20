import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { publishClass, unpublishClass } from "@/services/class.service";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action } = await req.json().catch(() => ({ action: "publish" }));

  try {
    const cls = action === "unpublish"
      ? await unpublishClass(id, session.userId)
      : await publishClass(id, session.userId);
    return NextResponse.json({ class: cls });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
