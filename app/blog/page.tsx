/**
 * Public Blog listing page — SSG + 5-min ISR.
 * Initial batch pre-rendered on server; client BlogGrid handles infinite scroll.
 */
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { FileText } from "lucide-react";
import BlogGrid from "./BlogGrid";

export const revalidate = 300;

const PAGE_SIZE = 9;

// ─── Cached fetchers ──────────────────────────────────────────────────────────

const getInitialBlogs = unstable_cache(
  async () => {
    const blogs = await prisma.blog.findMany({
      where:   { status: "PUBLISHED" },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take:    PAGE_SIZE + 1,
    });

    const hasMore = blogs.length > PAGE_SIZE;
    if (hasMore) blogs.pop();
    const nextCursor = hasMore ? blogs[blogs.length - 1].id : null;

    return {
      blogs: blogs.map((b) => ({
        id:         b.id,
        slug:       b.slug,
        title:      b.title,
        excerpt:    b.excerpt,
        thumbnail:  b.thumbnail,
        tags:       b.tags,
        readTime:   b.readTime,
        authorName: b.author.name,
        createdAt:  b.createdAt.toISOString(),
      })),
      nextCursor,
    };
  },
  ["blog-listing-initial"],
  { revalidate: 300, tags: ["blogs"] }
);

const getAllTags = unstable_cache(
  async () => {
    const blogs = await prisma.blog.findMany({
      where:  { status: "PUBLISHED", tags: { not: null } },
      select: { tags: true },
    });
    const tagSet = new Set<string>();
    blogs.forEach((b) => {
      b.tags?.split(",").forEach((t) => {
        const trimmed = t.trim();
        if (trimmed) tagSet.add(trimmed);
      });
    });
    return Array.from(tagSet).sort();
  },
  ["blog-tags"],
  { revalidate: 300, tags: ["blogs"] }
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BlogPage() {
  const [{ blogs, nextCursor }, tags] = await Promise.all([
    getInitialBlogs(),
    getAllTags(),
  ]);

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-400/20 rounded-full px-4 py-1.5 mb-4">
          <FileText className="w-4 h-4 text-orange-400" />
          <span className="text-orange-300 text-sm font-medium">Our Blog</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
          Insights &amp; Tutorials
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Learn from our latest articles, tutorials, and industry insights.
        </p>
      </div>

      {/* Tag cloud */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-xs text-muted-foreground bg-white/[0.06] border border-border px-3 py-1.5 rounded-full hover:bg-orange-500/15 hover:text-orange-300 hover:border-orange-400/20 transition-colors cursor-default"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Blog grid with infinite scroll */}
      {blogs.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-16 h-16 text-white/10 mx-auto mb-4" />
          <p className="text-muted-foreground/70 text-lg">No posts yet. Check back soon!</p>
        </div>
      ) : (
        <BlogGrid initialBlogs={blogs} initialCursor={nextCursor} />
      )}
    </div>
  );
}
