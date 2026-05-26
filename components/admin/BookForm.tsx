"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, FileText, Image as ImageIcon, Video, X } from "lucide-react";

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

  // Auto-derive slug from title when slug is empty
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
      fd.append("folder", "blogs");  // reuse existing image quota
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
      {/* Title + Slug */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title *">
          <input
            type="text"
            value={book.title}
            onChange={(e) => onTitleChange(e.target.value)}
            className={inputCls}
            required
          />
        </Field>
        <Field label="Slug *">
          <input
            type="text"
            value={book.slug}
            onChange={(e) => patch({ slug: e.target.value })}
            className={inputCls}
            required
            pattern="[a-z0-9-]+"
          />
        </Field>
      </div>

      <Field label="Author *">
        <input
          type="text"
          value={book.author}
          onChange={(e) => patch({ author: e.target.value })}
          className={inputCls}
          required
        />
      </Field>

      <Field label="Short description (1 line)">
        <input
          type="text"
          value={book.shortDesc}
          onChange={(e) => patch({ shortDesc: e.target.value })}
          maxLength={160}
          className={inputCls}
        />
      </Field>

      <Field label="Description *">
        <textarea
          value={book.description}
          onChange={(e) => patch({ description: e.target.value })}
          rows={6}
          className={inputCls}
          required
        />
      </Field>

      {/* Category + Language + Pages */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Category">
          <select
            value={book.categoryId ?? ""}
            onChange={(e) => patch({ categoryId: e.target.value || null })}
            className={inputCls}
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
            className={inputCls}
          />
        </Field>
        <Field label="Page count">
          <input
            type="number"
            value={book.pageCount ?? ""}
            onChange={(e) => patch({ pageCount: e.target.value ? Number(e.target.value) : null })}
            className={inputCls}
            min={0}
          />
        </Field>
      </div>

      {/* File upload */}
      <section className="rounded-xl border border-white/[0.08] bg-card/30 p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-4 w-4 text-orange-500" /> Book file (PDF / EPUB / DOCX, max 50 MB)
        </h3>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.epub,.docx,application/pdf,application/epub+zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => e.target.files?.[0] && uploadDocument(e.target.files[0])}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading !== null}
          className="flex items-center gap-2 rounded-lg bg-orange-500/15 px-4 py-2 text-sm font-semibold text-orange-500 hover:bg-orange-500/25 disabled:opacity-50"
        >
          {uploading === "file" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {book.fileUrl ? "Replace file" : "Upload file"}
        </button>
        {book.fileUrl && (
          <p className="mt-2 text-xs text-muted-foreground">
            ✓ Uploaded: {book.fileFormat}, {(book.fileSize / 1024 / 1024).toFixed(1)} MB (compressed by Cloudinary)
          </p>
        )}
      </section>

      {/* Cover + Video */}
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-white/[0.08] bg-card/30 p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-orange-500" /> Cover image
          </h3>
          {book.coverImage && (
            <div className="relative mb-3 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={book.coverImage} alt="cover" className="h-32 w-24 rounded-md border border-white/[0.08] object-cover" />
              <button
                type="button"
                onClick={() => patch({ coverImage: null })}
                className="absolute -top-1.5 -right-1.5 rounded-full bg-red-500 p-0.5 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <input
            ref={coverRef}
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => coverRef.current?.click()}
            disabled={uploading !== null}
            className="flex items-center gap-2 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
          >
            {uploading === "cover" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            {book.coverImage ? "Replace" : "Upload"}
          </button>
        </section>

        <section className="rounded-xl border border-white/[0.08] bg-card/30 p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
            <Video className="h-4 w-4 text-orange-500" /> Preview video (optional, max 200 MB)
          </h3>
          {book.previewVideo && (
            <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
              ✓ Uploaded
              <button
                type="button"
                onClick={() => patch({ previewVideo: null })}
                className="text-red-400 hover:text-red-300"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <input
            ref={videoRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={(e) => e.target.files?.[0] && uploadVideo(e.target.files[0])}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => videoRef.current?.click()}
            disabled={uploading !== null}
            className="flex items-center gap-2 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
          >
            {uploading === "video" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            {book.previewVideo ? "Replace" : "Upload"}
          </button>
        </section>
      </div>

      {/* Pricing */}
      <section className="rounded-xl border border-white/[0.08] bg-card/30 p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Pricing</h3>
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
                className={inputCls}
                min={0}
                step="0.01"
              />
            </Field>
            <Field label="Discount price (₹, optional)">
              <input
                type="number"
                value={book.discountPrice ?? ""}
                onChange={(e) => patch({ discountPrice: e.target.value ? Number(e.target.value) : null })}
                className={inputCls}
                min={0}
                step="0.01"
              />
            </Field>
          </div>
        )}
      </section>

      {/* Status + Revenue */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status">
          <select
            value={book.status}
            onChange={(e) => patch({ status: e.target.value as InitialBook["status"] })}
            className={inputCls}
          >
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </Field>
        {isAdmin ? (
          <Field label="Instructor revenue % (0 for platform books)">
            <input
              type="number"
              value={book.instructorRevenuePercent}
              onChange={(e) => patch({ instructorRevenuePercent: Number(e.target.value) })}
              className={inputCls}
              min={0}
              max={100}
            />
          </Field>
        ) : null}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy || uploading !== null}
          className="flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {bookId ? "Save Changes" : "Create Book"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-white/[0.08] px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

const inputCls = "h-10 w-full rounded-lg border border-white/[0.08] bg-secondary/40 px-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-orange-500/40 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
