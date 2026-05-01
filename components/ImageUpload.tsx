/**
 * ImageUpload — multi-upload image picker with "select primary" UX.
 *
 * Users can upload one or more images to Cloudinary; each uploaded image
 * appears in a gallery strip where the user picks exactly one as the primary.
 * The selected primary's secure URL is reported back through `onChange`.
 *
 * Designed as a drop-in replacement for the plain `<input type="url">`
 * thumbnail fields that existed across course / blog / profile forms.
 */
"use client";

import {
  ChangeEvent,
  DragEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Check, Loader2, Star, Trash2, Upload, X } from "lucide-react";
import toast from "react-hot-toast";

export type UploadFolder = "avatars" | "courses" | "blogs" | "misc";

interface UploadedImage {
  url:       string;
  publicId?: string;
}

interface ImageUploadProps {
  /** Currently selected primary image URL (persists across reloads). */
  value?:    string | null;
  /** Fires whenever the primary selection changes. Pass an empty string when cleared. */
  onChange:  (url: string) => void;
  /** Cloudinary folder for organisation. */
  folder?:   UploadFolder;
  /** Field label shown above the uploader. */
  label?:    string;
  /** Helper text shown below the dropzone. */
  hint?:     string;
  /** Hide label + hint for tight layouts. */
  compact?:  boolean;
}

export default function ImageUpload({
  value,
  onChange,
  folder  = "misc",
  label   = "Image",
  hint    = "PNG, JPG, WEBP · max 1 MB per file · 100 MB total quota.",
  compact = false,
}: ImageUploadProps) {
  // Candidates uploaded in this session + the current persisted value (if any).
  const [gallery, setGallery]   = useState<UploadedImage[]>(() =>
    value ? [{ url: value }] : [],
  );
  const [primary, setPrimary]   = useState<string>(value ?? "");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep local primary in sync if the parent resets the value externally.
  useEffect(() => {
    if (value && value !== primary) {
      setPrimary(value);
      setGallery((prev) =>
        prev.some((img) => img.url === value) ? prev : [{ url: value }, ...prev],
      );
    }
    if (!value && primary && !gallery.find((img) => img.url === primary)) {
      setPrimary("");
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (list.length === 0) {
        toast.error("Only image files are supported.");
        return;
      }

      setUploading(true);
      const uploaded: UploadedImage[] = [];

      for (const file of list) {
        const body = new FormData();
        body.append("file",   file);
        body.append("folder", folder);

        try {
          const res  = await fetch("/api/upload", { method: "POST", body });
          const data = await res.json();
          if (!res.ok) {
            toast.error(data.error ?? `Upload failed for ${file.name}.`);
            continue;
          }
          uploaded.push({ url: data.url, publicId: data.publicId });
        } catch {
          toast.error(`Upload failed for ${file.name}.`);
        }
      }

      if (uploaded.length > 0) {
        setGallery((prev) => [...prev, ...uploaded]);
        // Auto-select the first successful upload as primary if nothing picked yet.
        if (!primary) {
          setPrimary(uploaded[0].url);
          onChange(uploaded[0].url);
        }
        toast.success(
          uploaded.length === 1
            ? "Image uploaded."
            : `${uploaded.length} images uploaded.`,
        );
      }

      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    },
    [folder, onChange, primary],
  );

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) uploadFiles(e.target.files);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const selectPrimary = (url: string) => {
    setPrimary(url);
    onChange(url);
  };

  const removeImage = (url: string) => {
    setGallery((prev) => prev.filter((img) => img.url !== url));
    if (primary === url) {
      const next = gallery.find((img) => img.url !== url)?.url ?? "";
      setPrimary(next);
      onChange(next);
    }
  };

  return (
    <div className="space-y-3">
      {!compact && (
        <label className="label">
          {label}
          {primary && (
            <span className="ml-2 text-xs text-muted-foreground font-normal">
              — primary selected
            </span>
          )}
        </label>
      )}

      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 cursor-pointer transition-colors ${
          dragOver
            ? "border-[#d97757] bg-orange-500/5"
            : "border-border bg-secondary/50 hover:border-[#d97757]/50 hover:bg-secondary"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleInputChange}
        />
        {uploading ? (
          <>
            <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
            <p className="text-sm text-foreground font-medium">Uploading…</p>
          </>
        ) : (
          <>
            <Upload className="w-6 h-6 text-muted-foreground" />
            <p className="text-sm text-foreground font-medium">
              Click or drag images here to upload
            </p>
            {!compact && <p className="text-xs text-muted-foreground">{hint}</p>}
          </>
        )}
      </div>

      {/* Gallery of uploaded candidates */}
      {gallery.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {gallery.length === 1
              ? "Uploaded image (in use)."
              : `Uploaded ${gallery.length} images — click one to set as primary.`}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {gallery.map((img) => {
              const isPrimary = img.url === primary;
              return (
                <div
                  key={img.url}
                  className={`group relative aspect-video rounded-md overflow-hidden border-2 transition-all ${
                    isPrimary
                      ? "border-orange-500 ring-2 ring-orange-500/30"
                      : "border-border hover:border-[#d97757]/50"
                  }`}
                >
                  {/* Using a plain img here (not next/image) because the URL host
                     could be any configured Cloudinary cloud and we don't need
                     optimization inside a preview gallery. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt="uploaded preview"
                    className="w-full h-full object-cover"
                  />

                  {/* Primary badge */}
                  {isPrimary && (
                    <div className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full bg-orange-500 text-white text-[10px] font-semibold px-2 py-0.5 shadow">
                      <Check className="w-3 h-3" /> Primary
                    </div>
                  )}

                  {/* Hover actions */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    {!isPrimary && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); selectPrimary(img.url); }}
                        className="inline-flex items-center gap-1 rounded-md bg-white/95 hover:bg-white text-gray-900 text-xs font-medium px-2 py-1 shadow"
                      >
                        <Star className="w-3 h-3" /> Set primary
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeImage(img.url); }}
                      className="inline-flex items-center gap-1 rounded-md bg-red-500/95 hover:bg-red-500 text-white text-xs font-medium px-2 py-1 shadow"
                    >
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Optional raw URL (read-only display) */}
      {primary && !compact && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="shrink-0">URL:</span>
          <code className="flex-1 truncate bg-secondary rounded px-2 py-1 font-mono text-[11px]">
            {primary}
          </code>
          <button
            type="button"
            onClick={() => { setPrimary(""); onChange(""); }}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-red-500 transition-colors"
            aria-label="Clear selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * AvatarUpload — circular variant for profile pictures. Single-slot, but still
 * lets the user upload multiple candidates and pick the active one.
 */
export function AvatarUpload({
  value,
  onChange,
}: {
  value?: string | null;
  onChange: (url: string) => void;
}) {
  const [gallery, setGallery] = useState<UploadedImage[]>(() =>
    value ? [{ url: value }] : [],
  );
  const [primary, setPrimary] = useState(value ?? "");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value && value !== primary) {
      setPrimary(value);
      setGallery((prev) =>
        prev.some((img) => img.url === value) ? prev : [{ url: value }, ...prev],
      );
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const uploaded: UploadedImage[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "avatars");
      try {
        const res = await fetch("/api/upload", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) { toast.error(data.error ?? "Upload failed."); continue; }
        uploaded.push({ url: data.url, publicId: data.publicId });
      } catch {
        toast.error("Upload failed.");
      }
    }
    if (uploaded.length > 0) {
      setGallery((prev) => [...prev, ...uploaded]);
      if (!primary) { setPrimary(uploaded[0].url); onChange(uploaded[0].url); }
      toast.success("Avatar uploaded.");
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const select = (url: string) => { setPrimary(url); onChange(url); };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-border bg-secondary flex items-center justify-center">
          {primary ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={primary} alt="avatar preview" className="w-full h-full object-cover" />
          ) : (
            <Upload className="w-6 h-6 text-muted-foreground" />
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary hover:bg-secondary/70 px-3 py-1.5 text-sm font-medium text-foreground transition-colors"
          >
            <Upload className="w-4 h-4" /> Upload images
          </button>
          <p className="text-xs text-muted-foreground mt-1">
            Upload a few and pick the one you like best.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      </div>

      {gallery.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {gallery.map((img) => {
            const isPrimary = img.url === primary;
            return (
              <button
                key={img.url}
                type="button"
                onClick={() => select(img.url)}
                className={`relative w-14 h-14 rounded-full overflow-hidden border-2 transition-all ${
                  isPrimary
                    ? "border-orange-500 ring-2 ring-orange-500/30"
                    : "border-border hover:border-[#d97757]/50"
                }`}
                title={isPrimary ? "Primary avatar" : "Click to set as primary"}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="candidate avatar" className="w-full h-full object-cover" />
                {isPrimary && (
                  <span className="absolute -top-0.5 -right-0.5 bg-orange-500 rounded-full p-0.5">
                    <Check className="w-3 h-3 text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
