/**
 * POST /api/upload/document — Upload a book file (PDF / EPUB / DOCX) to Cloudinary.
 *
 * Compression is fully delegated to Cloudinary:
 *   - PDF        → resource_type: image + q_auto:eco + fl_lossy on delivery
 *   - EPUB/DOCX  → resource_type: raw, no transcoding (already zip)
 *
 * Limits:
 *   Per-file : 50 MB
 *   Per-user : 1 GB across all `kind = "document"` MediaAssets (separate
 *              quota from the 100 MB image quota enforced by /api/upload).
 *
 * Auth: ADMIN or INSTRUCTOR only.
 * Returns: MediaAsset row (id, url, publicId, bytes, format, kind, …)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  uploadPdfToCloudinary,
  uploadRawDocumentToCloudinary,
  BOOKS_FOLDER_PREFIX,
} from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_ASSET_BYTES = 50 * 1024 * 1024;        // 50 MB per file
const MAX_USER_BYTES  = 1024 * 1024 * 1024;       // 1 GB total per user

const PDF_MIME  = "application/pdf";
const EPUB_MIME = "application/epub+zip";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const ALLOWED   = new Set([PDF_MIME, EPUB_MIME, DOCX_MIME]);

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN" && session.role !== "INSTRUCTOR") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Only PDF, EPUB, or DOCX files are accepted." },
      { status: 415 },
    );
  }

  if (file.size > MAX_ASSET_BYTES) {
    return NextResponse.json(
      { error: "File exceeds the 50 MB per-file limit." },
      { status: 413 },
    );
  }

  const usage = await prisma.mediaAsset.aggregate({
    where: { userId: session.userId, kind: "document" },
    _sum:  { bytes: true },
  });
  const usedBytes = usage._sum.bytes ?? 0;

  if (usedBytes + file.size > MAX_USER_BYTES) {
    const usedMB = (usedBytes / 1024 / 1024).toFixed(1);
    return NextResponse.json(
      { error: `Document storage limit reached. You have used ${usedMB} MB of your 1 GB quota.` },
      { status: 413 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const folder = `${BOOKS_FOLDER_PREFIX}/books/${session.userId}`;
    const asset  = file.type === PDF_MIME
      ? await uploadPdfToCloudinary(buffer, folder, file.name)
      : await uploadRawDocumentToCloudinary(buffer, folder, file.name);

    const record = await prisma.mediaAsset.create({
      data: {
        userId:   session.userId,
        url:      asset.url,
        publicId: asset.publicId,
        folder:   "books",
        kind:     "document",
        filename: file.name,
        bytes:    asset.bytes,
        width:    0,
        height:   0,
        format:   asset.format,
      },
    });

    return NextResponse.json(record);
  } catch (err) {
    console.error("[upload:document]", err);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 },
    );
  }
}
