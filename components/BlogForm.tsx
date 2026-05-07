"use client";

import { useState, useMemo, FormEvent, KeyboardEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import slugify from "slugify";
import { ArrowLeft, X, Hash, Clock, FileText } from "lucide-react";
import toast from "react-hot-toast";

import GlassCard from "@/components/GlassCard";
import { processContentImages } from "@/lib/uploadImages";
import ImagePickerField from "@/components/ImagePickerField";
import MarkdownEditor from "@/components/MarkdownEditor";
import MediaLibraryModal from "@/components/MediaLibraryModal";
import { Button } from "@/components/ui/Button";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BlogFormInitialValues {
  id?: string;
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  thumbnail: string;
  tags: string;
  published: boolean;
}

interface BlogFormProps {
  mode: "create" | "edit";
  initial: BlogFormInitialValues;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toSlug(input: string) {
  return slugify(input, { lower: true, strict: true });
}

function splitTags(csv: string): string[] {
  return csv
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function joinTags(tags: string[]): string {
  return tags.join(", ");
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BlogForm({ mode, initial }: BlogFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug ?? toSlug(initial.title));
  const [slugEdited, setSlugEdited] = useState(!!initial.slug);
  const [excerpt, setExcerpt] = useState(initial.excerpt);
  const [content, setContent] = useState(initial.content);
  const [thumbnail, setThumbnail] = useState(initial.thumbnail);
  const [tags, setTags] = useState<string[]>(splitTags(initial.tags));
  const [tagDraft, setTagDraft] = useState("");
  const [published, setPublished] = useState(initial.published);
  const [loading, setLoading] = useState(false);

  // Inline image picker state (used by the Quill toolbar image button)
  const [pickerOpen, setPickerOpen] = useState(false);
  const pendingPickRef = useRef<((url: string | null) => void) | null>(null);

  // Slug auto-derives from title until the user edits it manually.
  function handleTitleChange(next: string) {
    setTitle(next);
    if (!slugEdited) setSlug(toSlug(next));
  }

  function handleSlugChange(next: string) {
    setSlug(toSlug(next));
    setSlugEdited(true);
  }

  function commitTagDraft() {
    const next = tagDraft.trim().replace(/,+$/, "").trim();
    if (!next) return;
    if (tags.includes(next)) {
      setTagDraft("");
      return;
    }
    setTags([...tags, next]);
    setTagDraft("");
  }

  function handleTagKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitTagDraft();
    } else if (e.key === "Backspace" && !tagDraft && tags.length) {
      setTags(tags.slice(0, -1));
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  // Opens the media library and resolves with the selected URL (or null).
  function pickImageFromLibrary(): Promise<string | null> {
    return new Promise((resolve) => {
      pendingPickRef.current = resolve;
      setPickerOpen(true);
    });
  }

  function handlePickerSelect(url: string) {
    const resolve = pendingPickRef.current;
    pendingPickRef.current = null;
    setPickerOpen(false);
    if (resolve) resolve(url || null);
  }

  function handlePickerClose() {
    const resolve = pendingPickRef.current;
    pendingPickRef.current = null;
    setPickerOpen(false);
    if (resolve) resolve(null);
  }

  // ── Derived stats ────────────────────────────────────────────────────────
  const { wordCount, readTime } = useMemo(() => {
    const plain = stripHtml(content);
    const words = plain ? plain.split(/\s+/).length : 0;
    return { wordCount: words, readTime: Math.max(1, Math.round(words / 200)) };
  }, [content]);

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title is required.");
    if (!stripHtml(content)) return toast.error("Content cannot be empty.");

    // Fold any in-progress tag draft into the list
    const finalTags = [...tags];
    if (tagDraft.trim()) {
      const extra = tagDraft.trim().replace(/,+$/, "").trim();
      if (extra && !finalTags.includes(extra)) finalTags.push(extra);
    }

    setLoading(true);

    const url = mode === "create" ? "/api/blogs" : `/api/blogs/${initial.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    try {
      // Upload any embedded data-URL images now that the user is saving
      const savedContent = await processContentImages(content, "blogs");

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug || undefined,
          excerpt: excerpt.trim() || undefined,
          content: savedContent,
          thumbnail: thumbnail || undefined,
          tags: joinTags(finalTags) || undefined,
          published,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save post.");
        return;
      }

      toast.success(mode === "create" ? "Blog post created!" : "Blog post updated!");
      router.push("/admin/blogs");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const isEdit = mode === "edit";

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/blogs"
        className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Blog Posts
      </Link>

      <h1 className="text-3xl font-bold text-foreground mb-8">
        {isEdit ? "Edit Post" : "Create New Post"}
      </h1>

      <GlassCard>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="label">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="input-glass"
              placeholder="e.g. Getting Started with Next.js"
              required
            />
          </div>

          {/* Slug */}
          <div>
            <label className="label">Slug</label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground/80 shrink-0 hidden sm:inline">
                /blog/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className="input-glass font-mono text-sm"
                placeholder="auto-generated-from-title"
              />
              {slugEdited && (
                <button
                  type="button"
                  onClick={() => {
                    setSlug(toSlug(title));
                    setSlugEdited(false);
                  }}
                  className="btn-ghost shrink-0 text-xs"
                  title="Re-generate from title"
                >
                  Reset
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground/70 mt-1">
              URL-friendly identifier. Auto-synced from the title until you edit it.
            </p>
          </div>

          {/* Excerpt */}
          <div>
            <label className="label">Excerpt</label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              className="input-glass resize-none"
              rows={2}
              maxLength={280}
              placeholder="Short summary shown on the blog listing…"
            />
            <p className="text-xs text-muted-foreground/60 mt-1">
              {excerpt.length}/280
            </p>
          </div>

          {/* Cover image */}
          <ImagePickerField
            label="Cover Image"
            folder="blogs"
            value={thumbnail}
            onChange={setThumbnail}
          />

          {/* Content */}
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <label className="label !mb-0">Content *</label>
              <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
                <span className="inline-flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {wordCount.toLocaleString()} words
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {readTime} min read
                </span>
              </div>
            </div>
            <MarkdownEditor
              value={content}
              onChange={setContent}
              placeholder="Write your blog post content here… (Markdown shortcuts + toolbar supported)"
              rows={16}
              onPickImage={pickImageFromLibrary}
            />
            <p className="text-xs text-muted-foreground/60 mt-2">
              Click the <span className="font-medium">image</span> toolbar button to insert images from your media library.
            </p>
          </div>

          {/* Tags */}
          <div>
            <label className="label">Tags</label>
            <div className="input-glass flex flex-wrap items-center gap-1.5 py-1.5 min-h-[42px]">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-md bg-orange-500/15 border border-[#d97757]/25 text-orange-300 text-xs font-medium px-2 py-0.5"
                >
                  <Hash className="w-3 h-3 opacity-70" />
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-0.5 rounded hover:bg-orange-500/30 p-0.5 transition-colors"
                    aria-label={`Remove ${tag}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={handleTagKey}
                onBlur={commitTagDraft}
                className="flex-1 min-w-[8rem] bg-transparent border-0 outline-none text-sm text-foreground placeholder-muted-foreground py-1"
                placeholder={tags.length ? "Add another…" : "nextjs, react, tutorial"}
              />
            </div>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Press <kbd className="px-1 py-0.5 bg-secondary border border-border rounded text-[10px]">Enter</kbd> or
              <kbd className="px-1 py-0.5 bg-secondary border border-border rounded text-[10px] mx-1">,</kbd>
              to add. Backspace on an empty field removes the last tag.
            </p>
          </div>

          {/* Publish toggle */}
          <div className="flex items-center justify-between bg-secondary border border-border rounded-md px-4 py-3">
            <div>
              <p className="text-foreground text-sm font-medium">
                {published ? "Published" : "Draft"}
              </p>
              <p className="text-muted-foreground/70 text-xs mt-0.5">
                {published
                  ? "This post is visible to everyone."
                  : isEdit
                  ? "Only admins can see drafts."
                  : "The post will be saved as a draft."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPublished(!published)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                published ? "bg-orange-600" : "bg-white/20"
              }`}
              aria-label={published ? "Unpublish" : "Publish"}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  published ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading}>
              {isEdit ? "Save Changes" : published ? "Publish Post" : "Save Draft"}
            </Button>
            <Link href="/admin/blogs" className="btn-ghost border border-border">
              Cancel
            </Link>
          </div>
        </form>
      </GlassCard>

      {/* Inline media picker for content images */}
      <MediaLibraryModal
        open={pickerOpen}
        onClose={handlePickerClose}
        onSelect={handlePickerSelect}
        defaultFolder="blogs"
        title="Insert image from library"
      />
    </div>
  );
}
