"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import BlogCard from "@/components/BlogCard";

const CACHE_KEY = "blog-grid-cache";
const SCROLL_KEY = "blog-grid-scroll";
const LAST_SLUG_KEY = "blog-grid-last-slug";

interface BlogItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  thumbnail: string | null;
  tags: string | null;
  readTime: number | null;
  authorName: string;
  createdAt: string;
}

interface Props {
  initialBlogs: BlogItem[];
  initialCursor: string | null;
}

function getCachedState(initialBlogs: BlogItem[]) {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    // Only restore if the initial data matches (same page)
    if (cached.initialFirstId === initialBlogs[0]?.id) {
      return { blogs: cached.blogs as BlogItem[], cursor: cached.cursor as string | null };
    }
  } catch {}
  return null;
}

export default function BlogGrid({ initialBlogs, initialCursor }: Props) {
  const cached = useRef(getCachedState(initialBlogs));
  const [blogs, setBlogs] = useState(cached.current?.blogs ?? initialBlogs);
  const [cursor, setCursor] = useState(cached.current?.cursor ?? initialCursor);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const restoredScroll = useRef(false);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/blogs?cursor=${cursor}&limit=9`);
      const data = await res.json();

      if (data.blogs?.length) {
        setBlogs((prev) => [
          ...prev,
          ...data.blogs.map((b: Record<string, unknown>) => ({
            id: b.id,
            slug: b.slug,
            title: b.title,
            excerpt: b.excerpt,
            thumbnail: b.thumbnail,
            tags: b.tags,
            readTime: b.readTime,
            authorName: (b.author as { name: string }).name,
            createdAt: b.createdAt,
          })),
        ]);
        setCursor(data.nextCursor);
      } else {
        setCursor(null);
      }
    } catch {
      // silently fail, user can scroll again
    } finally {
      setLoading(false);
    }
  }, [cursor, loading]);

  // Save state to sessionStorage whenever blogs/cursor change
  useEffect(() => {
    try {
      sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          blogs,
          cursor,
          initialFirstId: initialBlogs[0]?.id,
        })
      );
    } catch {}
  }, [blogs, cursor, initialBlogs]);

  // Restore scroll position to the last clicked blog
  useEffect(() => {
    if (restoredScroll.current) return;
    restoredScroll.current = true;

    const lastSlug = sessionStorage.getItem(LAST_SLUG_KEY);
    if (lastSlug && cached.current) {
      // Small delay to let the DOM render all cards
      requestAnimationFrame(() => {
        const el = document.getElementById(`blog-card-${lastSlug}`);
        if (el) {
          el.scrollIntoView({ block: "center", behavior: "instant" });
          // Brief highlight effect
          el.classList.add("ring-2", "ring-orange-400/30");
          setTimeout(() => el.classList.remove("ring-2", "ring-orange-400/30"), 1500);
        }
        sessionStorage.removeItem(LAST_SLUG_KEY);
      });
    }
  }, []);

  // Save last clicked blog slug
  const handleBlogClick = useCallback((slug: string) => {
    sessionStorage.setItem(LAST_SLUG_KEY, slug);
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
  }, []);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {blogs.map((blog, i) => (
          <motion.div
            key={blog.id}
            id={`blog-card-${blog.slug}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i < 9 ? i * 0.05 : 0 }}
            onClick={() => handleBlogClick(blog.slug)}
            className="rounded-lg transition-all duration-300 h-full"
          >
            <BlogCard
              slug={blog.slug}
              title={blog.title}
              excerpt={blog.excerpt}
              thumbnail={blog.thumbnail}
              tags={blog.tags}
              readTime={blog.readTime}
              authorName={blog.authorName}
              createdAt={blog.createdAt}
            />
          </motion.div>
        ))}
      </div>

      {/* Scroll sentinel + loading indicator */}
      {cursor && (
        <div ref={sentinelRef} className="flex justify-center py-12">
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground/70 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading more posts...
            </div>
          )}
        </div>
      )}

      {!cursor && blogs.length > 9 && (
        <p className="text-center text-white/25 text-sm py-10">
          You&apos;ve reached the end
        </p>
      )}
    </>
  );
}
