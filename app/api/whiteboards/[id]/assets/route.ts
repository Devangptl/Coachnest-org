/**
 * GET  /api/whiteboards/[id]/assets — list stored image assets (viewers+).
 * POST /api/whiteboards/[id]/assets — upload an image to Cloudinary and record
 *      it against an Excalidraw file id (editors+). Accepts PNG / JPG / SVG.
 */
import { NextRequest, NextResponse } from "next/server";
import { uploadBufferToCloudinary } from "@/lib/cloudinary";
import { canEdit, canView } from "@/lib/whiteboard/permissions";
import { getBoardRole } from "@/lib/whiteboard/guard";
import { ALLOWED_ASSET_MIME, ASSET_MAX_BYTES } from "@/lib/validation/whiteboard";
import { addAsset, listAssets } from "@/services/whiteboard.service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { session, role } = await getBoardRole(id);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canView(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const assets = await listAssets(id);
  return NextResponse.json({ assets });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { session, role } = await getBoardRole(id);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEdit(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = form.get("file");
  const fileId = form.get("fileId");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (typeof fileId !== "string" || !fileId) {
    return NextResponse.json({ error: "Missing fileId." }, { status: 400 });
  }
  if (!ALLOWED_ASSET_MIME.has(file.type)) {
    return NextResponse.json(
      { error: "Only PNG, JPG and SVG images are allowed." },
      { status: 415 },
    );
  }
  if (file.size > ASSET_MAX_BYTES) {
    return NextResponse.json(
      { error: "Image exceeds the 5 MB limit." },
      { status: 413 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadBufferToCloudinary(
      buffer,
      `coachnest/whiteboards/${id}`,
      file.name,
    );
    const asset = await addAsset({
      whiteboardId: id,
      uploadedById: session.userId,
      fileId,
      url: uploaded.url,
      publicId: uploaded.publicId,
      filename: file.name,
      mimeType: file.type,
      bytes: uploaded.bytes,
      width: uploaded.width,
      height: uploaded.height,
    });
    return NextResponse.json({ asset }, { status: 201 });
  } catch (err) {
    console.error("[whiteboard:asset-upload]", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
