/**
 * AvatarUploadField — single-image picker for the user's avatar.
 *
 * Uploads directly to /api/upload/avatar (no media-library UI). This is the
 * picker used by students, who don't have access to the full media library.
 *
 *   value    — current avatar URL (or empty string / undefined)
 *   onChange — called with the new URL whenever the user uploads or removes
 */
"use client";

import { useRef, useState } from "react";
import { ImageIcon, Upload, X } from "lucide-react";

interface AvatarUploadFieldProps {
  value?:   string | null;
  onChange: (url: string) => void;
  label?:   string;
}

export default function AvatarUploadField({
  value,
  onChange,
  label = "Avatar",
}: AvatarUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasImage = Boolean(value);

  const handleFile = async (file: File) => {
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("File must be an image.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const res = await fetch("/api/upload/avatar", {
        method: "POST",
        body:   formData,
      });
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
  };

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
          className="flex items-center gap-3 w-full max-w-xs rounded-lg border-2 border-dashed border-border bg-secondary/50 hover:border-orange-400/50 hover:bg-secondary px-4 py-6 text-left transition-colors disabled:opacity-50"
        >
          <Upload className="w-6 h-6 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground font-medium">
            {uploading ? "Uploading…" : "Upload avatar image"}
          </span>
        </button>
      )}

      <p className="text-xs text-muted-foreground">PNG, JPG, GIF or WebP. Max 1 MB.</p>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-300">{error}</p>
      )}
    </div>
  );
}
