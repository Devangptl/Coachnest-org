/**
 * Cloudinary server-side SDK singleton.
 *
 * Reads credentials from CLOUDINARY_URL (cloudinary://api_key:api_secret@cloud_name)
 * or from explicit CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
 * vars.
 *
 * All compression is delegated to Cloudinary's built-in optimizers:
 *   - Images   → q_auto + f_auto (WebP/AVIF on capable browsers)
 *   - Videos   → q_auto (adaptive H.264/AAC) + f_auto on delivery
 *   - PDFs     → q_auto:eco + fl_lossy (PDF treated as multi-page image)
 *   - EPUB/DOCX → raw, no transcoding (already DEFLATE zips)
 */
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

// Books-module assets live under the `coachnest` prefix so new uploads aren't
// tied to the legacy `learnhub` namespace used by the existing image route.
export const BOOKS_FOLDER_PREFIX = "coachnest";

function configure() {
  if (process.env.CLOUDINARY_URL) {
    // SDK reads CLOUDINARY_URL automatically; call config() to finalize.
    cloudinary.config({ secure: true });
    return;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure:     true,
  });
}

configure();

export { cloudinary };

export interface UploadedAsset {
  url:       string;
  publicId:  string;
  width:     number;
  height:    number;
  format:    string;
  bytes:     number;
}

/**
 * Upload a binary buffer to Cloudinary under the given folder.
 * Returns the secure URL plus metadata we persist alongside the image.
 */
export function uploadBufferToCloudinary(
  buffer:  Buffer,
  folder:  string,
  filename?: string,
): Promise<UploadedAsset> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        public_id: filename ? filename.replace(/\.[^.]+$/, "") : undefined,
        overwrite: false,
        unique_filename: true,
        // Auto-compress: Cloudinary picks optimal quality + serves WebP/AVIF.
        quality: "auto",
        fetch_format: "auto",
      },
      (err, result: UploadApiResponse | undefined) => {
        if (err || !result) return reject(err ?? new Error("Cloudinary upload failed"));
        resolve({
          url:      result.secure_url,
          publicId: result.public_id,
          width:    result.width,
          height:   result.height,
          format:   result.format,
          bytes:    result.bytes,
        });
      },
    );
    stream.end(buffer);
  });
}

export type CloudinaryResourceType = "image" | "video" | "raw";

/**
 * Upload a cover image (book cover, etc.) with Cloudinary's auto compression.
 * Identical to `uploadBufferToCloudinary` but scoped to the books namespace.
 */
export function uploadCoverImageToCloudinary(
  buffer: Buffer,
  folder: string,
  filename?: string,
): Promise<UploadedAsset> {
  return uploadBufferToCloudinary(buffer, folder, filename);
}

/**
 * Upload a preview/promo video. Cloudinary's `q_auto` re-encodes to an
 * efficient H.264/AAC MP4; delivery URLs can request WebM/AV1 via `f_auto`.
 */
export function uploadPreviewVideoToCloudinary(
  buffer: Buffer,
  folder: string,
  filename?: string,
): Promise<UploadedAsset> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "video",
        public_id: filename ? filename.replace(/\.[^.]+$/, "") : undefined,
        overwrite: false,
        unique_filename: true,
        quality: "auto",
        eager: [{ format: "mp4", quality: "auto" }],
      },
      (err, result: UploadApiResponse | undefined) => {
        if (err || !result) return reject(err ?? new Error("Cloudinary video upload failed"));
        resolve({
          url:      result.secure_url,
          publicId: result.public_id,
          width:    result.width ?? 0,
          height:   result.height ?? 0,
          format:   result.format,
          bytes:    result.bytes,
        });
      },
    );
    stream.end(buffer);
  });
}

/**
 * Upload a PDF. Cloudinary treats PDFs as multi-page "image" assets, which
 * unlocks PDF-aware transforms — `q_auto:eco` + `fl_lossy` recompresses the
 * raster images embedded in the PDF on delivery.
 */
export function uploadPdfToCloudinary(
  buffer: Buffer,
  folder: string,
  filename?: string,
): Promise<UploadedAsset> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        public_id: filename ? filename.replace(/\.[^.]+$/, "") : undefined,
        overwrite: false,
        unique_filename: true,
        quality: "auto:eco",
        type: "authenticated",
      },
      (err, result: UploadApiResponse | undefined) => {
        if (err || !result) return reject(err ?? new Error("Cloudinary PDF upload failed"));
        resolve({
          url:      result.secure_url,
          publicId: result.public_id,
          width:    result.width ?? 0,
          height:   result.height ?? 0,
          format:   result.format,
          bytes:    result.bytes,
        });
      },
    );
    stream.end(buffer);
  });
}

/**
 * Upload a raw document (EPUB / DOCX). No transcoding — both formats are
 * already DEFLATE-compressed zips, so further compression is negligible and
 * Cloudinary does not offer raw-resource transforms.
 */
export function uploadRawDocumentToCloudinary(
  buffer: Buffer,
  folder: string,
  filename?: string,
): Promise<UploadedAsset> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "raw",
        public_id: filename ? filename.replace(/\.[^.]+$/, "") : undefined,
        overwrite: false,
        unique_filename: true,
        type: "authenticated",
      },
      (err, result: UploadApiResponse | undefined) => {
        if (err || !result) return reject(err ?? new Error("Cloudinary raw upload failed"));
        resolve({
          url:      result.secure_url,
          publicId: result.public_id,
          width:    0,
          height:   0,
          format:   result.format ?? "",
          bytes:    result.bytes,
        });
      },
    );
    stream.end(buffer);
  });
}

/**
 * Generate a short-lived signed delivery URL for an uploaded book file.
 * Default TTL: 5 minutes. PDFs get the lossy delivery transform; raw assets
 * (EPUB/DOCX) are signed bare.
 */
export function getSignedDocumentUrl(
  publicId: string,
  resourceType: CloudinaryResourceType,
  ttlSeconds = 300,
): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  if (resourceType === "raw") {
    return cloudinary.utils.private_download_url(publicId, "", {
      resource_type: "raw",
      type: "authenticated",
      expires_at: expiresAt,
    });
  }
  // PDF (uploaded as image type): use a signed delivery URL with lossy transforms.
  return cloudinary.url(publicId, {
    resource_type: "image",
    type: "authenticated",
    sign_url: true,
    secure: true,
    transformation: [{ fetch_format: "auto", quality: "auto", flags: "lossy" }],
  });
}

/**
 * Remove an uploaded asset by public_id. Best-effort — swallows errors so
 * cleanup failures don't break the calling flow.
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: CloudinaryResourceType = "image",
): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.error("[cloudinary:delete]", err);
  }
}
