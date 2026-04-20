/**
 * Cloudinary server-side SDK singleton.
 *
 * Reads credentials from CLOUDINARY_URL (cloudinary://api_key:api_secret@cloud_name)
 * or from explicit CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
 * vars.
 *
 * Exposes:
 *   - `cloudinary`  — configured v2 SDK instance
 *   - `uploadBufferToCloudinary` — streams a buffer through upload_stream and
 *     returns `{ secure_url, public_id, width, height, format, bytes }`
 *   - `deleteFromCloudinary` — removes an asset by public_id
 */
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

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

/**
 * Remove an uploaded asset by public_id. Best-effort — swallows errors so
 * cleanup failures don't break the calling flow.
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (err) {
    console.error("[cloudinary:delete]", err);
  }
}
