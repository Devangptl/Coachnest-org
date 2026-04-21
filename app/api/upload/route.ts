/**
 * POST /api/upload — Upload an image to Cloudinary and save metadata to DB.
 *
 * Limits:
 *   Per-asset : 1 MB
 *   Per-user  : 100 MB total across all their media assets
 *
 * Body: multipart/form-data
 *   file   (required) image file
 *   folder (optional) "courses" | "blogs" | "avatars" | "misc"
 *
 * Auth: signed-in users only.
 * Returns: MediaAsset row (id, url, publicId, folder, …)
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { uploadBufferToCloudinary } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_ASSET_BYTES = 1 * 1024 * 1024;        // 1 MB per file
const MAX_USER_BYTES  = 100 * 1024 * 1024;       // 100 MB total per user
const ALLOWED_FOLDERS = new Set(["avatars", "courses", "blogs", "misc"]);
const FOLDER_PREFIX   = "learnhub";

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

  const file        = form.get("file");
  const folderInput = (form.get("folder") as string | null) ?? "misc";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image." }, { status: 415 });
  }

  // ── Per-asset size check ─────────────────────────────────────────────────────
  if (file.size > MAX_ASSET_BYTES) {
    return NextResponse.json(
      { error: "Image exceeds the 1 MB per-file limit." },
      { status: 413 },
    );
  }

  // ── Total storage quota check ─────────────────────────────────────────────────
  const usage = await prisma.mediaAsset.aggregate({
    where:  { userId: session.userId },
    _sum:   { bytes: true },
  });
  const usedBytes = usage._sum.bytes ?? 0;

  if (usedBytes + file.size > MAX_USER_BYTES) {
    const usedMB      = (usedBytes / 1024 / 1024).toFixed(1);
    const remainingMB = ((MAX_USER_BYTES - usedBytes) / 1024 / 1024).toFixed(1);
    return NextResponse.json(
      {
        error: `Storage limit reached. You have used ${usedMB} MB of your 100 MB quota (${remainingMB} MB remaining).`,
      },
      { status: 413 },
    );
  }

  const folder = ALLOWED_FOLDERS.has(folderInput) ? folderInput : "misc";

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const asset  = await uploadBufferToCloudinary(
      buffer,
      `${FOLDER_PREFIX}/${folder}`,
      file.name,
    );

    const record = await prisma.mediaAsset.create({
      data: {
        userId:   session.userId,
        url:      asset.url,
        publicId: asset.publicId,
        folder,
        filename: file.name,
        bytes:    asset.bytes,
        width:    asset.width,
        height:   asset.height,
        format:   asset.format,
      },
    });

    return NextResponse.json(record);
  } catch (err) {
    console.error("[upload]", err);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 },
    );
  }
}
