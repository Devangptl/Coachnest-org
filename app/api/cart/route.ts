/**
 * GET /api/cart — fetch the signed-in user's cart with items + totals.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCart } from "@/services/cart.service";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const cart = await getCart(session.userId);
  return NextResponse.json(cart);
}
