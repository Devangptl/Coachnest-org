/**
 * MediaLibraryModal — a full media library experience inside a modal.
 *
 * Flow:
 *  1. User clicks "Choose image" on any image field.
 *  2. Modal opens, showing their previously-uploaded images grouped by category.
 *  3. User can switch tabs (All / Courses / Blogs / Avatars / Misc) to browse.
 *  4. User can upload new images straight from the modal (drag-drop or file-pick).
 *  5. User clicks an image to select it (highlighted ring), then "Use this image".
 *  6. The selected URL is passed back via onSelect and the modal closes.
 *
 * The modal does NOT embed a Next.js <Image>: we display raw <img> previews
 * inside a fixed-size gallery where optimisation isn't needed.
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
import {
  Check,
  ImageIcon,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UploadFolder = "courses" | "blogs" | "avatars" | "misc";

interface MediaAsset {
  id:        string;
  url:       string;
  publicId:  string;
  folder:    string;
  filename:  string | null;
  bytes:     number;
  width:     number;
  height:    number;
  format:    string;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TABS: { label: string; value: UploadFolder | "all" }[] = [
  { label: "All",     value: "all"     },
  { label: "Courses", value: "courses" },
  { label: "Blogs",   value: "blogs"   },
  { label: "Avatars", value: "avatars" },
  { label: "Misc",    value: "misc"    },
];

function formatBytes(bytes: number) {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface MediaLibraryModalProps {
  open:           boolean;
  onClose:        () => void;
  onSelect:       (url: string) => void;
  /** Pre-select the tab that matches the use-case (e.g. "courses" when picking a course thumbnail). */
  defaultFolder?: UploadFolder | "all";
  title?:         string;
}

export default function MediaLibraryModal({
  open,
  onClose,
  onSelect,
  defaultFolder = "all",
  title         = "Media Library",
}: MediaLibraryModalProps) {
  const [activeTab,  setActiveTab]  = useState<UploadFolder | "all">(defaultFolder);
  const [assets,     setAssets]     = useState<MediaAsset[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [dragOver,   setDragOver]   = useState(false);
  const [selected,   setSelected]   = useState<MediaAsset | null>(null);
  const [deleting,   setDeleting]   = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // ── Fetch assets ────────────────────────────────────────────────────────────

  const fetchAssets = useCallback(
    async (tab: UploadFolder | "all", cursor?: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: "40" });
        if (tab !== "all") params.set("folder", tab);
        if (cursor) params.set("cursor", cursor);

        const res  = await fetch(`/api/media?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setAssets((prev) => cursor ? [...prev, ...data.assets] : data.assets);
        setNextCursor(data.nextCursor ?? null);
      } catch {
        toast.error("Could not load media library.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Reset + fetch when modal opens or tab changes.
  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setAssets([]);
    setNextCursor(null);
    fetchAssets(activeTab);
  }, [open, activeTab, fetchAssets]);

  // ── Upload ──────────────────────────────────────────────────────────────────

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (!list.length) { toast.error("Only image files are accepted."); return; }

      setUploading(true);
      const fresh: MediaAsset[] = [];

      const uploadFolder: UploadFolder =
        activeTab === "all" ? "misc" : (activeTab as UploadFolder);

      for (const file of list) {
        const body = new FormData();
        body.append("file",   file);
        body.append("folder", uploadFolder);
        try {
          const res  = await fetch("/api/upload", { method: "POST", body });
          const data = await res.json();
          if (!res.ok) { toast.error(data.error ?? `Upload failed: ${file.name}`); continue; }
          fresh.push(data as MediaAsset);
        } catch {
          toast.error(`Upload failed: ${file.name}`);
        }
      }

      if (fresh.length) {
        setAssets((prev) => [...fresh, ...prev]);
        toast.success(fresh.length === 1 ? "Image uploaded." : `${fresh.length} images uploaded.`);
      }

      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    },
    [activeTab],
  );

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) uploadFiles(e.target.files);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
  };

  // ── Delete ──────────────────────────────────────────────────────────────────

  const deleteAsset = async (asset: MediaAsset) => {
    if (!confirm(`Delete "${asset.filename ?? asset.id}"? This cannot be undone.`)) return;
    setDeleting(asset.id);
    try {
      const res = await fetch(`/api/media/${asset.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
      if (selected?.id === asset.id) setSelected(null);
      toast.success("Image deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(null);
    }
  };

  // ── Confirm ─────────────────────────────────────────────────────────────────

  const confirmSelection = () => {
    if (!selected) return;
    onSelect(selected.url);
    onClose();
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!open) return null;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div className="relative w-full max-w-10xl max-h-[90vh] flex flex-col bg-card border border-border rounded-xl shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <ImageIcon className="w-5 h-5 text-orange-500" />
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Upload zone + tabs row ── */}
        <div className="px-5 pt-4 pb-3 border-b border-border shrink-0 space-y-3">
          {/* Drag-drop upload strip */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 cursor-pointer transition-colors ${
              dragOver
                ? "border-orange-400 bg-orange-500/5"
                : "border-border bg-secondary/40 hover:border-orange-400/50 hover:bg-secondary"
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
                <Loader2 className="w-5 h-5 text-orange-500 animate-spin shrink-0" />
                <span className="text-sm text-foreground font-medium">Uploading…</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 text-muted-foreground shrink-0" />
                <div>
                  <span className="text-sm text-foreground font-medium">
                    Click or drag to upload images
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    PNG, JPG, WEBP · max 1 MB per file · 100 MB total
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Category tabs */}
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => { setActiveTab(tab.value); setSelected(null); }}
                className={`shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.value
                    ? "bg-orange-500 text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Image grid ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
              <Loader2 className="w-7 h-7 animate-spin" />
              <span className="text-sm">Loading your media library…</span>
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
              <ImageIcon className="w-10 h-10 opacity-30" />
              <p className="text-sm">No images yet. Upload some above!</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {assets.map((asset) => {
                  const isSelected = selected?.id === asset.id;
                  const isDeleting = deleting === asset.id;
                  return (
                    <div
                      key={asset.id}
                      onClick={() => setSelected(isSelected ? null : asset)}
                      className={`group relative aspect-video rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                        isSelected
                          ? "border-orange-500 ring-2 ring-orange-500/40 shadow-lg"
                          : "border-border hover:border-orange-400/50"
                      } ${isDeleting ? "opacity-50 pointer-events-none" : ""}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={asset.url}
                        alt={asset.filename ?? asset.id}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />

                      {/* Selected overlay */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                          <div className="bg-orange-500 rounded-full p-1.5 shadow-lg">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}

                      {/* Hover actions */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors" />
                      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-end justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] text-white/90 bg-black/60 rounded px-1.5 py-0.5 truncate max-w-[70%]">
                          {asset.filename ?? asset.format}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); deleteAsset(asset); }}
                          className="p-1 rounded bg-red-500/90 hover:bg-red-500 text-white shadow"
                          aria-label="Delete"
                        >
                          {isDeleting
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* File size badge */}
                      <div className="absolute top-1.5 right-1.5 text-[10px] text-white/80 bg-black/50 rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {formatBytes(asset.bytes)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Load more */}
              {nextCursor && (
                <div className="flex justify-center mt-5">
                  <button
                    type="button"
                    onClick={() => fetchAssets(activeTab, nextCursor)}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-secondary text-sm text-foreground hover:bg-secondary/70 transition-colors disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Load more
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer: selection preview + confirm ── */}
        <div className="flex items-center gap-3 px-5 py-3 border-t border-border bg-secondary/40 shrink-0">
          {selected ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.url}
                alt="selected"
                className="w-12 h-8 rounded object-cover border border-border shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {selected.filename ?? selected.id}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selected.width && selected.height
                    ? `${selected.width} × ${selected.height} · `
                    : ""}
                  {formatBytes(selected.bytes)}
                </p>
              </div>
              <button
                type="button"
                onClick={confirmSelection}
                className="shrink-0 inline-flex items-center gap-2 rounded-md bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm px-4 py-2 transition-colors shadow"
              >
                <Check className="w-4 h-4" /> Use this image
              </button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground flex-1">
              Click an image above to select it, then press &ldquo;Use this image&rdquo;.
            </p>
          )}
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary hover:bg-secondary/70 text-foreground text-sm px-3 py-2 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
