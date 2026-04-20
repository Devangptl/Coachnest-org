/**
 * POST /api/upload — Upload an image to Cloudinary and save metadata to DB.
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

const MAX_BYTES       = 10 * 1024 * 1024;
const ALLOWED_FOLDERS = new Set(["avatars", "courses", "blogs", "misc"]);
const FOLDER_PREFIX   = "learnhub";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Image exceeds ${MAX_BYTES / 1024 / 1024} MB limit.` },
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

    // Persist metadata so users can browse their library later.
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
