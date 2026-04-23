"use client";

/**
 * CourseForm — shared create/edit form for admin courses.
 *
 * Full-width, two-column layout: primary content (title, description, thumbnail,
 * preview video) on the left; a sticky settings sidebar (status, pricing,
 * category, level, language, revenue split, tags) on the right.
 */
import { useMemo, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import ImagePickerField from "@/components/ImagePickerField";
import MarkdownEditor from "@/components/MarkdownEditor";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export type CourseFormMode = "create" | "edit";

export interface CourseFormInitial {
  id?: string;
  title?: string;
  shortDesc?: string | null;
  description?: string;
  thumbnail?: string | null;
  previewVideo?: string | null;
  price?: number | string | null;
  discountPrice?: number | string | null;
  isFree?: boolean;
  level?: string;
  language?: string;
  status?: string;
  categoryId?: string | null;
  instructorRevenuePercent?: number;
  tagNames?: string[];
}

export interface CourseCategoryOption {
  id: string;
  name: string;
}

export default function CourseForm({
  mode,
  initial = {},
  categories,
  suggestedTags = [],
  onCancelHref,
  apiBasePath = "/api/courses",
  redirectAfterCreateBase = "/admin/courses",
  canEditRevenuePercent = true,
  statusOptions,
}: {
  mode: CourseFormMode;
  initial?: CourseFormInitial;
  categories: CourseCategoryOption[];
  suggestedTags?: string[];
  onCancelHref: string;
  /** Where to POST (create) / PATCH (edit). "/[id]" is appended in edit mode. */
  apiBasePath?: string;
  /** After create, navigates to `${redirectAfterCreateBase}/${id}/edit`. */
  redirectAfterCreateBase?: string;
  /** Instructors can't change their own revenue split. */
  canEditRevenuePercent?: boolean;
  /** Override the status options in edit mode (default: admin set). */
  statusOptions?: Array<{ value: string; label: string }>;
}) {
  const router = useRouter();

  // ── State ────────────────────────────────────────────────────────────────
  const [title, setTitle]               = useState(initial.title ?? "");
  const [shortDesc, setShortDesc]       = useState(initial.shortDesc ?? "");
  const [description, setDescription]   = useState(initial.description ?? "");
  const [thumbnail, setThumbnail]       = useState(initial.thumbnail ?? "");
  const [previewVideo, setPreviewVideo] = useState(initial.previewVideo ?? "");

  const [price, setPrice]               = useState(initial.price != null ? String(initial.price) : "");
  const [discountPrice, setDiscountPrice] = useState(
    initial.discountPrice != null ? String(initial.discountPrice) : ""
  );
  const [isFree, setIsFree]             = useState(Boolean(initial.isFree));
  const [level, setLevel]               = useState(initial.level ?? "beginner");
  const [language, setLanguage]         = useState(initial.language ?? "English");
  const [categoryId, setCategoryId]     = useState(initial.categoryId ?? "");
  const [status, setStatus]             = useState(initial.status ?? "DRAFT");
  const [revenuePercent, setRevenuePercent] = useState(
    String(initial.instructorRevenuePercent ?? 70)
  );
  const [tags, setTags]                 = useState<string[]>(initial.tagNames ?? []);
  const [tagInput, setTagInput]         = useState("");
  const [loading, setLoading]           = useState(false);

  const published = status === "PUBLISHED";

  // Derived: what % off, for live feedback
  const discountPct = useMemo(() => {
    const p  = parseFloat(price);
    const dp = parseFloat(discountPrice);
    if (!Number.isFinite(p) || !Number.isFinite(dp) || p <= 0 || dp <= 0 || dp >= p) return null;
    return Math.round(((p - dp) / p) * 100);
  }, [price, discountPrice]);

  const addTag = (value: string) => {
    const clean = value.trim().replace(/,+$/, "").slice(0, 40);
    if (!clean) return;
    if (tags.includes(clean)) return;
    if (tags.length >= 10) { toast("Maximum 10 tags"); return; }
    setTags((t) => [...t, clean]);
    setTagInput("");
  };

  const removeTag = (t: string) => setTags((arr) => arr.filter((x) => x !== t));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast.error("Title and description are required.");
      return;
    }
    if (!isFree && price !== "" && parseFloat(price) < 0) {
      toast.error("Price cannot be negative.");
      return;
    }
    if (
      !isFree &&
      discountPrice !== "" &&
      (parseFloat(discountPrice) < 0 ||
        (price !== "" && parseFloat(discountPrice) >= parseFloat(price)))
    ) {
      toast.error("Discount price must be less than regular price.");
      return;
    }
    const pct = Number(revenuePercent);
    if (!Number.isInteger(pct) || pct < 70 || pct > 80) {
      toast.error("Revenue share must be an integer between 70 and 80.");
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        shortDesc: shortDesc.trim() || null,
        description,
        thumbnail: thumbnail || null,
        previewVideo: previewVideo.trim() || null,
        price: isFree ? null : price ? parseFloat(price) : null,
        discountPrice:
          isFree || !discountPrice ? null : parseFloat(discountPrice),
        isFree,
        level,
        language: language.trim() || "English",
        categoryId: categoryId || null,
        instructorRevenuePercent: pct,
        tagNames: tags,
      };

      if (mode === "create") {
        payload.published = published;
      } else {
        payload.status = status;
      }

      const url =
        mode === "create" ? apiBasePath : `${apiBasePath}/${initial.id}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? (mode === "create" ? "Failed to create course." : "Update failed."));
        return;
      }

      if (mode === "create") {
        toast.success("Course created!");
        router.push(`${redirectAfterCreateBase}/${data.course.id}/edit`);
      } else {
        toast.success("Course saved!");
        router.refresh();
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* ── LEFT: Content ───────────────────────────────────────────────── */}
      <div className="xl:col-span-2 space-y-6 min-w-0">
        <GlassCard>
          <h2 className="text-lg font-semibold text-foreground mb-4">Basic info</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Course Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-glass"
                placeholder="e.g. React for Beginners"
                required
                maxLength={120}
              />
            </div>
            <div>
              <label className="label">Short Tagline</label>
              <input
                type="text"
                value={shortDesc}
                onChange={(e) => setShortDesc(e.target.value)}
                className="input-glass"
                placeholder="One-line summary shown on course cards (max 140 chars)"
                maxLength={140}
              />
              <p className="text-muted-foreground/70 text-xs mt-1">
                {shortDesc.length}/140
              </p>
            </div>
            <div>
              <label className="label">Description *</label>
              <MarkdownEditor
                value={description}
                onChange={setDescription}
                placeholder="What will students learn? Who is this course for?"
                rows={10}
              />
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-lg font-semibold text-foreground mb-4">Media</h2>
          <div className="space-y-4">
            <ImagePickerField
              label="Thumbnail"
              folder="courses"
              value={thumbnail}
              onChange={setThumbnail}
            />
            <div>
              <label className="label">Preview Video URL</label>
              <input
                type="url"
                value={previewVideo}
                onChange={(e) => setPreviewVideo(e.target.value)}
                className="input-glass"
                placeholder="https://youtu.be/... or MP4 URL"
              />
              <p className="text-muted-foreground/70 text-xs mt-1">
                Shown on the course landing page so students can preview before buying.
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Tags */}
        <GlassCard>
          <h2 className="text-lg font-semibold text-foreground mb-2">Tags</h2>
          <p className="text-muted-foreground/70 text-xs mb-3">
            Helps search and discovery. Up to 10 tags.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {tags.length === 0 && (
              <span className="text-muted-foreground/70 text-sm">No tags yet.</span>
            )}
            {tags.map((t) => (
              <Badge key={t} variant="purple" className="pl-2.5 pr-1.5 py-1 text-xs">
                {t}
                <button
                  type="button"
                  className="ml-1 text-muted-foreground hover:text-foreground"
                  onClick={() => removeTag(t)}
                  aria-label={`Remove ${t}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag(tagInput);
                } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
                  setTags((arr) => arr.slice(0, -1));
                }
              }}
              className="input-glass flex-1"
              placeholder="Type and press Enter or comma"
              maxLength={40}
            />
            <Button type="button" variant="secondary" onClick={() => addTag(tagInput)}>
              Add
            </Button>
          </div>

          {suggestedTags.length > 0 && (
            <div className="mt-3">
              <p className="text-muted-foreground/70 text-xs mb-1.5">Suggested:</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestedTags
                  .filter((t) => !tags.includes(t))
                  .slice(0, 12)
                  .map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => addTag(t)}
                      className="px-2 py-0.5 text-xs rounded border border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-orange-400/40"
                    >
                      + {t}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      {/* ── RIGHT: Settings sidebar ─────────────────────────────────────── */}
      <div className="xl:col-span-1 space-y-6 min-w-0">
        <GlassCard className="xl:sticky xl:top-20">
          <h2 className="text-lg font-semibold text-foreground mb-4">Publishing</h2>

          {mode === "edit" ? (
            <div>
              <label className="label">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="input-glass"
              >
                {(statusOptions ?? [
                  { value: "DRAFT", label: "Draft" },
                  { value: "PUBLISHED", label: "Published" },
                  { value: "PENDING_REVIEW", label: "Pending Review" },
                  { value: "ARCHIVED", label: "Archived" },
                ]).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-secondary border border-border rounded-md px-3 py-2.5">
              <div>
                <p className="text-foreground text-sm font-medium">Publish immediately</p>
                <p className="text-muted-foreground/70 text-xs mt-0.5">
                  Students can enroll once published.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStatus(published ? "DRAFT" : "PUBLISHED")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  published ? "bg-orange-600" : "bg-white/20"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    published ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          )}

          <div className="h-px bg-border my-5" />

          <h3 className="text-foreground font-semibold text-sm mb-3">Pricing</h3>
          <div className="flex items-center justify-between bg-secondary border border-border rounded-md px-3 py-2.5 mb-3">
            <p className="text-foreground text-sm font-medium">Free course</p>
            <button
              type="button"
              onClick={() => setIsFree(!isFree)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isFree ? "bg-emerald-500" : "bg-white/20"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  isFree ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {!isFree && (
            <div className="space-y-3">
              <div>
                <label className="label">Price (INR)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="input-glass"
                  placeholder="999"
                  min="0"
                  step="1"
                />
              </div>
              <div>
                <label className="label">Discount Price (INR)</label>
                <input
                  type="number"
                  value={discountPrice}
                  onChange={(e) => setDiscountPrice(e.target.value)}
                  className="input-glass"
                  placeholder="Optional — must be below price"
                  min="0"
                  step="1"
                />
                {discountPct != null && (
                  <p className="text-emerald-400 text-xs mt-1">{discountPct}% off</p>
                )}
              </div>
            </div>
          )}

          <div className="h-px bg-border my-5" />

          <h3 className="text-foreground font-semibold text-sm mb-3">Classification</h3>
          <div className="space-y-3">
            <div>
              <label className="label">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="input-glass"
              >
                <option value="">— None —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="input-glass"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="label">Language</label>
              <input
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="input-glass"
                placeholder="English"
              />
            </div>
          </div>

          <div className="h-px bg-border my-5" />

          <h3 className="text-foreground font-semibold text-sm mb-3">Revenue split</h3>
          {canEditRevenuePercent ? (
            <div>
              <label className="label">Instructor revenue %</label>
              <input
                type="number"
                value={revenuePercent}
                onChange={(e) => setRevenuePercent(e.target.value)}
                className="input-glass"
                min={70}
                max={80}
                step={1}
              />
              <p className="text-muted-foreground/70 text-xs mt-1">
                Instructor gets {revenuePercent || 70}%, platform gets{" "}
                {100 - Number(revenuePercent || 70)}%. Must be 70–80.
              </p>
            </div>
          ) : (
            <div>
              <label className="label">Instructor revenue %</label>
              <input
                type="number"
                value={revenuePercent}
                disabled
                readOnly
                className="input-glass opacity-60 cursor-not-allowed"
              />
              <p className="text-muted-foreground/70 text-xs mt-1">
                Set by admin. You keep {revenuePercent || 70}% of each sale.
              </p>
            </div>
          )}

          <div className="h-px bg-border my-5" />

          <div className="flex gap-2">
            <Button type="submit" loading={loading} className="flex-1">
              {mode === "create" ? "Create Course" : "Save Changes"}
            </Button>
            <Link href={onCancelHref} className="btn-ghost border border-border">
              Cancel
            </Link>
          </div>
        </GlassCard>
      </div>
    </form>
  );
}
