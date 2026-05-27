/**
 * POST /api/upload/video — Upload a preview/promo video to Cloudinary.
 *
 * Compression: Cloudinary `q_auto` re-encodes to optimal H.264/AAC; delivery
 * URLs can serve WebM/AV1 via `f_auto`.
 *
 * Limits:
 *   Per-file : 200 MB
 *   Per-user : 2 GB across all `kind = "video"` MediaAssets.
 *
 * Auth: ADMIN or INSTRUCTOR only.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  uploadPreviewVideoToCloudinary,
  BOOKS_FOLDER_PREFIX,
} from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_ASSET_BYTES = 200 * 1024 * 1024;        // 200 MB per file
const MAX_USER_BYTES  = 2 * 1024 * 1024 * 1024;    // 2 GB total per user

const ALLOWED = new Set(["video/mp4", "video/webm", "video/quicktime"]);

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
      { error: "Only MP4, WebM, or MOV videos are accepted." },
      { status: 415 },
    );
  }
  if (file.size > MAX_ASSET_BYTES) {
    return NextResponse.json(
      { error: "Video exceeds the 200 MB per-file limit." },
      { status: 413 },
    );
  }

  const usage = await prisma.mediaAsset.aggregate({
    where: { userId: session.userId, kind: "video" },
    _sum:  { bytes: true },
  });
  const usedBytes = usage._sum.bytes ?? 0;
  if (usedBytes + file.size > MAX_USER_BYTES) {
    const usedMB = (usedBytes / 1024 / 1024).toFixed(1);
    return NextResponse.json(
      { error: `Video storage limit reached. You have used ${usedMB} MB of your 2 GB quota.` },
      { status: 413 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const folder = `${BOOKS_FOLDER_PREFIX}/videos/${session.userId}`;
    const asset  = await uploadPreviewVideoToCloudinary(buffer, folder, file.name);

    const record = await prisma.mediaAsset.create({
      data: {
        userId:   session.userId,
        url:      asset.url,
        publicId: asset.publicId,
        folder:   "videos",
        kind:     "video",
        filename: file.name,
        bytes:    asset.bytes,
        width:    asset.width,
        height:   asset.height,
        format:   asset.format,
      },
    });

    return NextResponse.json(record);
  } catch (err) {
    console.error("[upload:video]", err);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 },
    );
  }
}
