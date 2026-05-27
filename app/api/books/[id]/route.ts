/**
 * GET    /api/books/[id]  — fetch one book (by id or slug)
 * PATCH  /api/books/[id]  — update (owner or ADMIN)
 * DELETE /api/books/[id]  — delete (owner or ADMIN)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getBookById, updateBook, deleteBook } from "@/services/book.service";

export const runtime = "nodejs";

interface Ctx { params: Promise<{ id: string }>; }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const book = await getBookById(id);
  if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(book);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const updated = await updateBook(id, body, { userId: session.userId, role: session.role });
    return NextResponse.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update";
    const status = msg === "Forbidden" ? 403 : msg === "Book not found" ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  try {
    await deleteBook(id, { userId: session.userId, role: session.role });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete";
    const status = msg === "Forbidden" ? 403 : msg === "Book not found" ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
