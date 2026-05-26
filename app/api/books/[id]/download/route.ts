/**
 * GET /api/books/[id]/download
 * Returns a short-lived signed Cloudinary URL for the book file, but only
 * if the requesting user owns a BookPurchase row for this book. Each call
 * increments BookPurchase.downloads for audit/usage tracking.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSignedDocumentUrl, type CloudinaryResourceType } from "@/lib/cloudinary";

export const runtime = "nodejs";

interface Ctx { params: Promise<{ id: string }>; }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const purchase = await prisma.bookPurchase.findUnique({
    where:  { userId_bookId: { userId: session.userId, bookId: id } },
    include: {
      book: { select: { id: true, title: true, filePublicId: true, fileFormat: true } },
    },
  });
  if (!purchase || !purchase.book) {
    return NextResponse.json({ error: "You do not own this book" }, { status: 403 });
  }

  // PDFs were uploaded as resource_type "image" (PDF-aware transforms);
  // EPUB/DOCX were uploaded as "raw".
  const resourceType: CloudinaryResourceType =
    purchase.book.fileFormat === "PDF" ? "image" : "raw";

  const url = getSignedDocumentUrl(purchase.book.filePublicId, resourceType);

  // Fire-and-forget download counter
  prisma.bookPurchase.update({
    where: { id: purchase.id },
    data:  { downloads: { increment: 1 } },
  }).catch(console.error);

  return NextResponse.json({
    url,
    title:  purchase.book.title,
    format: purchase.book.fileFormat,
    expiresInSeconds: 300,
  });
}
