/**
 * ImageCropModal — interactive avatar crop dialog.
 *
 * Lets the user drag + zoom the picked image inside a circular crop
 * viewport, then returns the cropped result as a square JPEG Blob.
 * No external dependency — built on the existing Radix Dialog primitive
 * and HTML Canvas.
 *
 * Usage:
 *   <ImageCropModal
 *     open={open}
 *     src={dataUrl}
 *     onClose={() => setOpen(false)}
 *     onApply={(blob) => upload(blob)}
 *   />
 */
"use client";

import {
  useCallback, useEffect, useMemo, useRef, useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, ZoomIn, ZoomOut, Loader2 } from "lucide-react";

interface Props {
  open:        boolean;
  src:         string;
  onClose:    () => void;
  onApply:    (blob: Blob) => void | Promise<void>;
  outputSize?: number;  // Final exported JPEG square edge (px). Default 512.
  cropSize?:   number;  // Visible crop viewport edge in the modal (px). Default 300.
}

const ZOOM_MIN  = 1;
const ZOOM_MAX  = 4;
const ZOOM_STEP = 0.05;

export default function ImageCropModal({
  open,
  src,
  onClose,
  onApply,
  outputSize = 512,
  cropSize   = 300,
}: Props) {
  const [naturalW, setNaturalW]     = useState(0);
  const [naturalH, setNaturalH]     = useState(0);
  const [imgLoaded, setImgLoaded]   = useState(false);
  const [zoom, setZoom]             = useState(1);
  const [pos, setPos]               = useState({ x: 0, y: 0 });
  const [busy, setBusy]             = useState(false);
  const initialPositioned           = useRef(false);
  const dragStart = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  // ── Scale that lets the shorter image dimension fit cropSize at zoom=1.
  // Multiplying by `zoom` gives the actual display scale.
  const baseScale = useMemo(() => {
    if (!naturalW || !naturalH) return 1;
    return cropSize / Math.min(naturalW, naturalH);
  }, [naturalW, naturalH, cropSize]);
  const totalScale = baseScale * zoom;
  const displayW = naturalW * totalScale;
  const displayH = naturalH * totalScale;

  // ── Constrain pos so the image fully covers the crop window
  const clampPos = useCallback(
    (x: number, y: number) => ({
      x: Math.max(cropSize - displayW, Math.min(0, x)),
      y: Math.max(cropSize - displayH, Math.min(0, y)),
    }),
    [cropSize, displayW, displayH],
  );

  // ── Reset state when the modal opens with a new image
  useEffect(() => {
    if (!open) return;
    setImgLoaded(false);
    setZoom(1);
    setPos({ x: 0, y: 0 });
    initialPositioned.current = false;
  }, [open, src]);

  // ── First center on load; afterwards, just re-clamp on zoom changes
  useEffect(() => {
    if (!imgLoaded) return;
    if (!initialPositioned.current) {
      setPos(clampPos((cropSize - displayW) / 2, (cropSize - displayH) / 2));
      initialPositioned.current = true;
    } else {
      setPos((p) => clampPos(p.x, p.y));
    }
  }, [imgLoaded, baseScale, zoom, displayW, displayH, cropSize, clampPos]);

  // ── Pointer drag (works for mouse + touch)
  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    dragStart.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.px;
    const dy = e.clientY - dragStart.current.py;
    setPos(clampPos(dragStart.current.x + dx, dragStart.current.y + dy));
  }
  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    dragStart.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  }

  // ── Wheel = zoom (desktop)
  function onWheel(e: ReactWheelEvent<HTMLDivElement>) {
    e.preventDefault();
    setZoom((z) => clamp(z + (e.deltaY > 0 ? -ZOOM_STEP * 2 : ZOOM_STEP * 2), ZOOM_MIN, ZOOM_MAX));
  }

  // ── Render the cropped square to canvas + emit Blob
  async function handleApply() {
    if (!imgLoaded || busy) return;
    setBusy(true);
    try {
      const blob = await renderCroppedBlob({
        src, pos, totalScale, cropSize, outputSize,
      });
      await onApply(blob);
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="
            fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm
            data-[state=open]:animate-in data-[state=open]:fade-in-0
            data-[state=closed]:animate-out data-[state=closed]:fade-out-0
          "
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="
            fixed left-1/2 top-1/2 z-[71] -translate-x-1/2 -translate-y-1/2
            w-[calc(100%-1.5rem)] max-w-md
            rounded-2xl bg-card border border-border p-5 shadow-2xl
            data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=open]:fade-in-0
            data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=closed]:fade-out-0
          "
        >
          <DialogPrimitive.Title className="text-base font-semibold text-foreground mb-1">
            Adjust your photo
          </DialogPrimitive.Title>
          <p className="text-xs text-muted-foreground mb-4">
            Drag to reposition, scroll or use the slider to zoom.
          </p>

          {/* ── Crop viewport ───────────────────────────────────────────── */}
          <div
            className="relative mx-auto rounded-lg overflow-hidden bg-black select-none touch-none cursor-grab active:cursor-grabbing"
            style={{ width: cropSize, height: cropSize }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              draggable={false}
              onLoad={(e) => {
                const img = e.currentTarget;
                setNaturalW(img.naturalWidth);
                setNaturalH(img.naturalHeight);
                setImgLoaded(true);
              }}
              style={{
                position: "absolute",
                left:   pos.x,
                top:    pos.y,
                width:  displayW,
                height: displayH,
                maxWidth: "none",
                userSelect: "none",
                pointerEvents: "none",
              }}
            />

            {/* Circular cutout overlay using SVG mask */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox={`0 0 ${cropSize} ${cropSize}`}
            >
              <defs>
                <mask id="crop-hole">
                  <rect width="100%" height="100%" fill="white" />
                  <circle cx={cropSize / 2} cy={cropSize / 2} r={cropSize / 2 - 2} fill="black" />
                </mask>
              </defs>
              <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#crop-hole)" />
              <circle
                cx={cropSize / 2}
                cy={cropSize / 2}
                r={cropSize / 2 - 2}
                fill="none"
                stroke="white"
                strokeOpacity={0.85}
                strokeWidth={2}
              />
              {/* Centre crosshair */}
              <line x1={cropSize / 2} y1={cropSize / 2 - 8} x2={cropSize / 2} y2={cropSize / 2 + 8} stroke="white" strokeOpacity={0.5} strokeWidth={1} />
              <line x1={cropSize / 2 - 8} y1={cropSize / 2} x2={cropSize / 2 + 8} y2={cropSize / 2} stroke="white" strokeOpacity={0.5} strokeWidth={1} />
            </svg>

            {!imgLoaded && (
              <div className="absolute inset-0 grid place-items-center text-white/80">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            )}
          </div>

          {/* ── Zoom control ─────────────────────────────────────────────── */}
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom((z) => clamp(z - ZOOM_STEP * 4, ZOOM_MIN, ZOOM_MAX))}
              aria-label="Zoom out"
              className="rounded-md p-1.5 hover:bg-secondary transition-colors"
            >
              <ZoomOut className="w-4 h-4 text-muted-foreground" />
            </button>
            <input
              type="range"
              min={ZOOM_MIN}
              max={ZOOM_MAX}
              step={ZOOM_STEP}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-[#d97757] h-1 cursor-pointer"
              aria-label="Zoom"
            />
            <button
              type="button"
              onClick={() => setZoom((z) => clamp(z + ZOOM_STEP * 4, ZOOM_MIN, ZOOM_MAX))}
              aria-label="Zoom in"
              className="rounded-md p-1.5 hover:bg-secondary transition-colors"
            >
              <ZoomIn className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* ── Footer ───────────────────────────────────────────────────── */}
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 rounded-md border border-border bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium px-4 py-2 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!imgLoaded || busy}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-[#d97757] hover:bg-[#c4684a] text-white text-sm font-bold px-4 py-2 transition-colors disabled:opacity-50"
            >
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Apply"}
            </button>
          </div>

          <DialogPrimitive.Close
            aria-label="Close"
            onClick={onClose}
            disabled={busy}
            className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ─── Pure helpers ────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Render the visible crop window to an outputSize × outputSize JPEG Blob.
 *
 * The preview shows the image at `totalScale` translated to `pos`. The
 * crop window covers (0,0)→(cropSize,cropSize). So the source rectangle
 * on the original image is:
 *
 *   x = -pos.x / totalScale
 *   y = -pos.y / totalScale
 *   width = height = cropSize / totalScale
 *
 * Canvas drawImage with those source coords gives a pixel-perfect match
 * to what the user saw in the modal viewport.
 */
async function renderCroppedBlob(args: {
  src:        string;
  pos:        { x: number; y: number };
  totalScale: number;
  cropSize:   number;
  outputSize: number;
}): Promise<Blob> {
  const { src, pos, totalScale, cropSize, outputSize } = args;

  const img = await loadImage(src);

  const sx = -pos.x / totalScale;
  const sy = -pos.y / totalScale;
  const s  = cropSize / totalScale;

  const canvas = document.createElement("canvas");
  canvas.width  = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, s, s, 0, 0, outputSize, outputSize);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to encode image"))),
      "image/jpeg",
      0.92,
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}
