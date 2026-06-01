/**
 * POST /api/admin/platform-offers/[id]/notify
 *
 * Admin-triggered announcement: sends a promotional email AND creates an
 * in-app notification for every STUDENT user about this offer. The offer
 * must be active. Users who already received a notification for this
 * offer (matched on link + type) are skipped, so the button is safe to
 * click multiple times.
 *
 * Body: none.
 * Response: { recipients, emailsSent, alreadyNotified }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canAccessAdminPath } from "@/lib/admin-permissions";
import { notifyUsersOfOffer } from "@/services/platform-offer.service";

export const runtime = "nodejs";
// Notifying thousands of users can take a while — give the request room.
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, ctx: Params) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!canAccessAdminPath(session.adminSubRole, "/admin/platform-offers")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  try {
    const result = await notifyUsersOfOffer(id);
    return NextResponse.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Notify failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
