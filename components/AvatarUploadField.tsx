/**
 * AvatarUploadField — single-image picker for the user's avatar.
 *
 * Flow: user picks a file → ImageCropModal opens with a circular
 * crop viewport → user drags/zooms/rotates → "Apply" uploads the
 * cropped JPEG to /api/upload/avatar.
 *
 *   value    — current avatar URL (or empty string / undefined)
 *   onChange — called with the new URL whenever the user uploads or removes
 */
"use client";

import { useRef, useState } from "react";
import { ImageIcon, Upload, X, Crop } from "lucide-react";
import ImageCropModal from "./ImageCropModal";

interface AvatarUploadFieldProps {
  value?:   string | null;
  onChange: (url: string) => void;
  label?:   string;
}

// 8 MB raw input cap — the cropped output is JPEG and will be far smaller,
// well under the server-side 1 MB limit on /api/upload/avatar.
const MAX_RAW_BYTES = 8 * 1024 * 1024;

export default function AvatarUploadField({
  value,
  onChange,
  label = "Avatar",
}: AvatarUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Source data URL fed into the crop modal
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const hasImage = Boolean(value);

  function handleFile(file: File) {
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("File must be an image.");
      return;
    }
    if (file.size > MAX_RAW_BYTES) {
      setError("Image is too large. Pick one under 8 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") setCropSrc(result);
    };
    reader.onerror = () => setError("Could not read the file.");
    reader.readAsDataURL(file);
  }

  async function handleCropApply(blob: Blob) {
    setError(null);
    setUploading(true);
    setCropSrc(null);

    const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res  = await fetch("/api/upload/avatar", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed.");
        return;
      }
      onChange(data.url);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-muted-foreground text-sm font-medium mb-1.5 flex items-center gap-2">
          <ImageIcon className="w-3.5 h-3.5" /> {label}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {hasImage ? (
        <div className="flex items-center gap-3">
          <div className="relative rounded-full overflow-hidden border border-border bg-secondary w-20 h-20 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value!}
              alt="avatar"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium px-3 py-1.5 disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              {uploading ? "Uploading…" : "Change"}
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => onChange("")}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-400/30 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-300 text-xs font-medium px-3 py-1.5 disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-3 w-full max-w-xs rounded-lg border-2 border-dashed border-border bg-secondary/50 hover:border-[#d97757]/50 hover:bg-secondary px-4 py-6 text-left transition-colors disabled:opacity-50"
        >
          <Upload className="w-6 h-6 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground font-medium">
            {uploading ? "Uploading…" : "Upload avatar image"}
          </span>
        </button>
      )}

      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Crop className="w-3 h-3" /> PNG, JPG, GIF or WebP. Up to 8 MB — you'll crop before upload.
      </p>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-300">{error}</p>
      )}

      {cropSrc && (
        <ImageCropModal
          open
          src={cropSrc}
          onClose={() => setCropSrc(null)}
          onApply={handleCropApply}
        />
      )}
    </div>
  );
}
