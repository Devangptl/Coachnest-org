"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import MarkdownEditor from "@/components/MarkdownEditor";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function NewBlogPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [tags, setTags] = useState("");
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          excerpt: excerpt || undefined,
          content,
          thumbnail: thumbnail || undefined,
          tags: tags || undefined,
          published,
        }),
      });

      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to create post."); return; }

      toast.success("Blog post created!");
      router.push("/admin/blogs");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/blogs"
        className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Blog Posts
      </Link>

      <h1 className="text-3xl font-bold text-foreground mb-8">Create New Post</h1>

      <GlassCard>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="label">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-glass"
              placeholder="e.g. Getting Started with Next.js"
              required
            />
          </div>

          {/* Excerpt */}
          <div>
            <label className="label">Excerpt</label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              className="input-glass resize-none"
              rows={2}
              placeholder="Short summary shown on the blog listing..."
            />
          </div>

          {/* Content */}
          <div>
            <label className="label">Content *</label>
            <MarkdownEditor
              value={content}
              onChange={setContent}
              placeholder="Write your blog post content here... (supports Markdown)"
              rows={16}
            />
          </div>

          {/* Thumbnail URL */}
          <div>
            <label className="label">Cover Image URL</label>
            <input
              type="url"
              value={thumbnail}
              onChange={(e) => setThumbnail(e.target.value)}
              className="input-glass"
              placeholder="https://images.unsplash.com/..."
            />
          </div>

          {/* Tags */}
          <div>
            <label className="label">Tags</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="input-glass"
              placeholder="nextjs, react, tutorial (comma-separated)"
            />
          </div>

          {/* Publish toggle */}
          <div className="flex items-center justify-between bg-secondary border border-border rounded-md px-4 py-3">
            <div>
              <p className="text-foreground text-sm font-medium">Publish immediately</p>
              <p className="text-muted-foreground/70 text-xs mt-0.5">Published posts are visible to everyone.</p>
            </div>
            <button
              type="button"
              onClick={() => setPublished(!published)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${published ? "bg-orange-600" : "bg-white/20"}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${published ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading}>
              Create Post
            </Button>
            <Link href="/admin/blogs" className="btn-ghost border border-border">
              Cancel
            </Link>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
