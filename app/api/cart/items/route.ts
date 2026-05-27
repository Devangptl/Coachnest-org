/**
 * POST /api/cart/items — add { bookId } to the user's cart.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { addToCart } from "@/services/cart.service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { bookId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.bookId) return NextResponse.json({ error: "Missing bookId" }, { status: 400 });

  try {
    await addToCart(session.userId, body.bookId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to add to cart";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
