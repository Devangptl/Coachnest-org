/**
 * ImagePickerField — a compact image-field that opens the MediaLibraryModal.
 *
 * Use this wherever you need to let a user attach an image to something
 * (course thumbnail, blog cover, avatar, etc.).  It shows:
 *   - A preview of the currently-selected image (if any)
 *   - "Choose from library" button → opens MediaLibraryModal
 *   - "Remove" link to clear the selection
 *
 * The value / onChange contract is identical to a plain <input type="url">:
 *   value    — the current image URL string (or empty string / undefined)
 *   onChange — called with the new URL string whenever the selection changes
 */
"use client";

import { useState } from "react";
import { ImageIcon, Pencil, X } from "lucide-react";
import MediaLibraryModal, { type UploadFolder } from "./MediaLibraryModal";

interface ImagePickerFieldProps {
  /** Current image URL. */
  value?:    string | null;
  /** Called with the new URL when the user picks or clears an image. */
  onChange:  (url: string) => void;
  /** Cloudinary folder / library tab pre-selected when the modal opens. */
  folder?:   UploadFolder;
  /** Label shown above the field. */
  label?:    string;
  /** Text for the open-modal button. */
  buttonLabel?: string;
}

export default function ImagePickerField({
  value,
  onChange,
  folder       = "misc",
  label        = "Image",
  buttonLabel  = "Choose from library",
}: ImagePickerFieldProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const hasImage = Boolean(value);

  return (
    <>
      <div className="space-y-2">
        {label && <p className="label">{label}</p>}

        {hasImage ? (
          /* ── Preview card ── */
          <div className="relative group rounded-lg overflow-hidden border border-border bg-secondary w-full aspect-video max-w-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value!}
              alt="selected image"
              className="w-full h-full object-cover"
            />

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-white/95 hover:bg-white text-gray-900 text-xs font-medium px-2.5 py-1.5 shadow"
              >
                <Pencil className="w-3.5 h-3.5" /> Change
              </button>
              <button
                type="button"
                onClick={() => onChange("")}
                className="inline-flex items-center gap-1.5 rounded-md bg-red-500/95 hover:bg-red-500 text-white text-xs font-medium px-2.5 py-1.5 shadow"
              >
                <X className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          </div>
        ) : (
          /* ── Empty state button ── */
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-3 w-full max-w-xs rounded-lg border-2 border-dashed border-border bg-secondary/50 hover:border-[#d97757]/50 hover:bg-secondary px-4 py-6 text-left transition-colors"
          >
            <ImageIcon className="w-6 h-6 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground font-medium">
              {buttonLabel}
            </span>
          </button>
        )}

        {/* Small change link when image is set */}
        {hasImage && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="text-xs text-orange-500 hover:text-[#d97757] transition-colors"
          >
            Open media library to change
          </button>
        )}
      </div>

      <MediaLibraryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={onChange}
        defaultFolder={folder}
      />
    </>
  );
}
