/**
 * POST /api/upload/avatar — upload a single image to use as the user's avatar.
 *
 * Unlike /api/upload, this endpoint is available to every signed-in user
 * (including students), because it does not expose a media library — the
 * file is uploaded directly to Cloudinary under "avatars" and only the
 * resulting URL is returned.
 *
 * Limits:
 *   Per-file: 1 MB
 *
 * Body: multipart/form-data
 *   file (required) image file
 *
 * Auth: signed-in users only.
 * Returns: { url, publicId }
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { uploadBufferToCloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";

const MAX_AVATAR_BYTES = 1 * 1024 * 1024; // 1 MB
const FOLDER = "learnhub/avatars";

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

  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image." }, { status: 415 });
  }

  if (file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json(
      { error: "Avatar exceeds the 1 MB size limit." },
      { status: 413 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const asset = await uploadBufferToCloudinary(buffer, FOLDER, file.name);

    return NextResponse.json({ url: asset.url, publicId: asset.publicId });
  } catch (err) {
    console.error("[upload:avatar]", err);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 },
    );
  }
}
