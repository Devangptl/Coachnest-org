"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Upload, FileText, Image as ImageIcon, Video, X,
  Save, BookOpen, IndianRupee, Settings,
} from "lucide-react";

interface CategoryOption { id: string; name: string; }

interface InitialBook {
  id?:                       string;
  title:                     string;
  slug:                      string;
  description:               string;
  shortDesc:                 string;
  coverImage:                string | null;
  previewVideo:              string | null;
  author:                    string;
  pageCount:                 number | null;
  language:                  string;
  fileFormat:                "PDF" | "EPUB" | "DOCX";
  fileUrl:                   string;
  filePublicId:              string;
  fileSize:                  number;
  price:                     number | null;
  discountPrice:             number | null;
  isFree:                    boolean;
  status:                    "DRAFT" | "PUBLISHED" | "ARCHIVED";
  instructorRevenuePercent:  number;
  categoryId:                string | null;
}

interface Props {
  initial?:     Partial<InitialBook>;
  categories:   CategoryOption[];
  isAdmin:      boolean;
  bookId?:      string;
}

const EMPTY: InitialBook = {
  title: "", slug: "", description: "", shortDesc: "",
  coverImage: null, previewVideo: null,
  author: "", pageCount: null, language: "English",
  fileFormat: "PDF", fileUrl: "", filePublicId: "", fileSize: 0,
  price: null, discountPrice: null, isFree: false,
  status: "DRAFT", instructorRevenuePercent: 70, categoryId: null,
};

export default function BookForm({ initial, categories, isAdmin, bookId }: Props) {
  const router = useRouter();
  const [book, setBook] = useState<InitialBook>({ ...EMPTY, ...initial });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<"file" | "cover" | "video" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileRef  = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  function patch(p: Partial<InitialBook>) { setBook((b) => ({ ...b, ...p })); }

  function onTitleChange(v: string) {
    const slug = book.slug || v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    patch({ title: v, slug });
  }

  async function uploadDocument(file: File) {
    setUploading("file");
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/document", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      const ext = file.name.split(".").pop()?.toUpperCase() ?? "";
      const fmt = ext === "PDF" ? "PDF" : ext === "EPUB" ? "EPUB" : "DOCX";
      patch({
        fileUrl: data.url,
        filePublicId: data.publicId,
        fileSize: data.bytes,
        fileFormat: fmt as InitialBook["fileFormat"],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function uploadCover(file: File) {
    setUploading("cover");
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "blogs");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Cover upload failed");
      patch({ coverImage: data.url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cover upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function uploadVideo(file: File) {
    setUploading("video");
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/video", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Video upload failed");
      patch({ previewVideo: data.url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Video upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!book.title || !book.slug || !book.description || !book.author) {
      setError("Title, slug, author, and description are required.");
      return;
    }
    if (!book.fileUrl) {
      setError("Please upload the book file first.");
      return;
    }
    setBusy(true);
    try {
      const url = bookId ? `/api/books/${bookId}` : "/api/books";
      const method = bookId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(book),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      router.push(isAdmin ? "/admin/books" : "/instructor/books");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 max-w-3xl">
      {/* ── Basics ─────────────────────────────────────────────── */}
      <Section icon={BookOpen} title="Basics">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" required>
            <input
              type="text"
              value={book.title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="input-glass"
              placeholder="The Pragmatic Programmer"
              required
            />
          </Field>
          <Field label="URL slug" required hint="Lowercase, hyphens only">
            <input
              type="text"
              value={book.slug}
              onChange={(e) => patch({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
              className="input-glass"
              pattern="[a-z0-9-]+"
              required
            />
          </Field>
        </div>

        <Field label="Author" required hint="Display author name (may differ from your account)">
          <input
            type="text"
            value={book.author}
            onChange={(e) => patch({ author: e.target.value })}
            className="input-glass"
            required
          />
        </Field>

        <Field label="Short description" hint="One-line tagline shown in search results (max 160 chars)">
          <input
            type="text"
            value={book.shortDesc}
            onChange={(e) => patch({ shortDesc: e.target.value })}
            maxLength={160}
            className="input-glass"
          />
        </Field>

        <Field label="Full description" required>
          <textarea
            value={book.description}
            onChange={(e) => patch({ description: e.target.value })}
            rows={6}
            className="input-glass !py-2 resize-y"
            placeholder="What's inside this book? Who is it for?"
            required
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Category">
            <select
              value={book.categoryId ?? ""}
              onChange={(e) => patch({ categoryId: e.target.value || null })}
              className="input-glass"
            >
              <option value="">(None)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Language">
            <input
              type="text"
              value={book.language}
              onChange={(e) => patch({ language: e.target.value })}
              className="input-glass"
            />
          </Field>
          <Field label="Page count">
            <input
              type="number"
              value={book.pageCount ?? ""}
              onChange={(e) => patch({ pageCount: e.target.value ? Number(e.target.value) : null })}
              className="input-glass"
              min={0}
            />
          </Field>
        </div>
      </Section>

      {/* ── File upload ────────────────────────────────────────── */}
      <Section icon={FileText} title="Book file" subtitle="PDF, EPUB, or DOCX — up to 50 MB. Cloudinary auto-compresses on upload.">
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.epub,.docx,application/pdf,application/epub+zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => e.target.files?.[0] && uploadDocument(e.target.files[0])}
          className="hidden"
        />
        {book.fileUrl ? (
          <div className="flex items-center gap-3 rounded-md border border-border bg-secondary/40 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-500/15 border border-orange-500/25 text-orange-500">
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {book.fileFormat} file uploaded
              </p>
              <p className="text-xs text-muted-foreground">
                {(book.fileSize / 1024 / 1024).toFixed(1)} MB · compressed by Cloudinary
              </p>
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading !== null}
              className="btn-ghost !text-xs"
            >
              {uploading === "file" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              Replace
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading !== null}
            className="group w-full rounded-md border-2 border-dashed border-border bg-secondary/30 px-6 py-8 text-center transition-colors hover:border-orange-500/40 hover:bg-orange-500/5 disabled:opacity-50"
          >
            <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground group-hover:text-orange-500" />
            <p className="text-sm font-medium text-foreground">
              {uploading === "file" ? "Uploading…" : "Click to upload book file"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, EPUB, DOCX · max 50 MB
            </p>
          </button>
        )}
      </Section>

      {/* ── Media ──────────────────────────────────────────────── */}
      <Section icon={ImageIcon} title="Media">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Cover */}
          <div>
            <p className="label flex items-center gap-1.5">
              <ImageIcon className="h-3 w-3" /> Cover image
            </p>
            <input
              ref={coverRef}
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])}
              className="hidden"
            />
            {book.coverImage ? (
              <div className="flex items-start gap-3">
                <div className="relative h-32 w-24 flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={book.coverImage} alt="cover" className="h-full w-full rounded-md border border-border object-cover" />
                  <button
                    type="button"
                    onClick={() => patch({ coverImage: null })}
                    aria-label="Remove cover"
                    className="absolute -top-1.5 -right-1.5 rounded-full bg-red-500 p-0.5 text-white shadow-md"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => coverRef.current?.click()}
                  disabled={uploading !== null}
                  className="btn-ghost !text-xs"
                >
                  {uploading === "cover" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                  Replace
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => coverRef.current?.click()}
                disabled={uploading !== null}
                className="group flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-secondary/30 px-4 py-6 text-xs text-muted-foreground hover:border-orange-500/40 hover:bg-orange-500/5 hover:text-orange-500 disabled:opacity-50"
              >
                {uploading === "cover" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload cover image
              </button>
            )}
          </div>

          {/* Preview video */}
          <div>
            <p className="label flex items-center gap-1.5">
              <Video className="h-3 w-3" /> Preview video <span className="font-normal text-muted-foreground/60">(optional)</span>
            </p>
            <input
              ref={videoRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={(e) => e.target.files?.[0] && uploadVideo(e.target.files[0])}
              className="hidden"
            />
            {book.previewVideo ? (
              <div className="flex items-center gap-3 rounded-md border border-border bg-secondary/40 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-500/15 border border-orange-500/25 text-orange-500">
                  <Video className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0 text-sm">
                  <p className="font-medium text-foreground">Video uploaded</p>
                  <p className="text-xs text-muted-foreground">Cloudinary-compressed</p>
                </div>
                <button
                  type="button"
                  onClick={() => patch({ previewVideo: null })}
                  aria-label="Remove video"
                  className="rounded-md p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => videoRef.current?.click()}
                disabled={uploading !== null}
                className="group flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-secondary/30 px-4 py-6 text-xs text-muted-foreground hover:border-orange-500/40 hover:bg-orange-500/5 hover:text-orange-500 disabled:opacity-50"
              >
                {uploading === "video" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload preview video (max 200 MB)
              </button>
            )}
          </div>
        </div>
      </Section>

      {/* ── Pricing ────────────────────────────────────────────── */}
      <Section icon={IndianRupee} title="Pricing">
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={book.isFree}
            onChange={(e) => patch({ isFree: e.target.checked })}
          />
          This book is free
        </label>
        {!book.isFree && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Price (₹)">
              <input
                type="number"
                value={book.price ?? ""}
                onChange={(e) => patch({ price: e.target.value ? Number(e.target.value) : null })}
                className="input-glass"
                min={0}
                step="0.01"
                placeholder="299"
              />
            </Field>
            <Field label="Discount price (₹)" hint="Optional — must be less than the regular price">
              <input
                type="number"
                value={book.discountPrice ?? ""}
                onChange={(e) => patch({ discountPrice: e.target.value ? Number(e.target.value) : null })}
                className="input-glass"
                min={0}
                step="0.01"
                placeholder="199"
              />
            </Field>
          </div>
        )}
      </Section>

      {/* ── Publishing ─────────────────────────────────────────── */}
      <Section icon={Settings} title="Publishing">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status">
            <select
              value={book.status}
              onChange={(e) => patch({ status: e.target.value as InitialBook["status"] })}
              className="input-glass"
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </Field>
          {isAdmin && (
            <Field label="Instructor revenue %" hint="0 for platform-owned books">
              <input
                type="number"
                value={book.instructorRevenuePercent}
                onChange={(e) => patch({ instructorRevenuePercent: Number(e.target.value) })}
                className="input-glass"
                min={0}
                max={100}
              />
            </Field>
          )}
        </div>
      </Section>

      {/* ── Error + actions ────────────────────────────────────── */}
      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={busy || uploading !== null}
          className="btn-primary !py-2 !px-4 !text-sm"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {bookId ? "Save Changes" : "Create Book"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-ghost !text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── helpers ─────────────────────────────────────────────────────

function Section({
  icon: Icon, title, subtitle, children,
}: { icon: React.ElementType; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <header className="mb-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="h-4 w-4 text-orange-500" />
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 ml-6 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label, required, hint, children,
}: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">
        {label}
        {required && <span className="ml-0.5 text-orange-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground/80">{hint}</span>}
    </label>
  );
}
