/**
 * GET  /api/books   — list books (public; PUBLISHED only unless filtered)
 * POST /api/books   — create a new book (ADMIN or INSTRUCTOR)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listBooks, createBook } from "@/services/book.service";
import type { BookFileFormat, ContentStatus } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q          = url.searchParams.get("q") ?? undefined;
  const categoryId = url.searchParams.get("categoryId") ?? undefined;
  const page       = Number(url.searchParams.get("page") ?? "1");
  const pageSize   = Number(url.searchParams.get("pageSize") ?? "12");

  const result = await listBooks({
    q, categoryId, page, pageSize,
    status: "PUBLISHED",
  });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN" && session.role !== "INSTRUCTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const required = [
    "title", "slug", "description", "author",
    "fileFormat", "fileUrl", "filePublicId", "fileSize",
  ] as const;
  for (const key of required) {
    if (!body[key]) {
      return NextResponse.json({ error: `Missing required field: ${key}` }, { status: 400 });
    }
  }

  try {
    const book = await createBook({
      title:           String(body.title),
      slug:            String(body.slug),
      description:     String(body.description),
      shortDesc:       body.shortDesc ? String(body.shortDesc) : null,
      coverImage:      body.coverImage ? String(body.coverImage) : null,
      previewVideo:    body.previewVideo ? String(body.previewVideo) : null,
      author:          String(body.author),
      pageCount:       body.pageCount ? Number(body.pageCount) : null,
      language:        body.language ? String(body.language) : "English",
      fileFormat:      body.fileFormat as BookFileFormat,
      fileUrl:         String(body.fileUrl),
      filePublicId:    String(body.filePublicId),
      fileSize:        Number(body.fileSize),
      price:           body.price != null ? Number(body.price) : null,
      discountPrice:   body.discountPrice != null ? Number(body.discountPrice) : null,
      isFree:          Boolean(body.isFree),
      status:          (body.status as ContentStatus) ?? "DRAFT",
      instructorRevenuePercent: body.instructorRevenuePercent != null
        ? Number(body.instructorRevenuePercent)
        : (session.role === "ADMIN" ? 0 : 70),
      categoryId:      body.categoryId ? String(body.categoryId) : null,
      organizationId:  body.organizationId ? String(body.organizationId) : null,
    }, session.userId);
    return NextResponse.json(book, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create book";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
