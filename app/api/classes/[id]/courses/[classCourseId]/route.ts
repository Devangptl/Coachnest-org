import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { removeCourseFromClass } from "@/services/class.service";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; classCourseId: string }> },
) {
  const { id, classCourseId } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await removeCourseFromClass(id, classCourseId, session.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
