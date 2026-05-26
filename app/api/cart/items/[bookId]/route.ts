/**
 * DELETE /api/cart/items/[bookId] — remove an item from the cart.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { removeFromCart } from "@/services/cart.service";

export const runtime = "nodejs";

interface Ctx { params: Promise<{ bookId: string }>; }

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { bookId } = await ctx.params;
  await removeFromCart(session.userId, bookId);
  return NextResponse.json({ success: true });
}
