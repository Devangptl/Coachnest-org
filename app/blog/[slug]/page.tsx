/**
 * Public Blog detail page — SSG + 5-min ISR.
 * Content is stored as Markdown and rendered via MarkdownRenderer.
 */
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Clock, User, Calendar, Tag } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import MarkdownRenderer from "@/components/MarkdownRenderer";

export const revalidate = 300;

// ─── Cached data fetchers ─────────────────────────────────────────────────────

const getBlog = unstable_cache(
  async (slug: string) =>
    prisma.blog.findUnique({
      where:   { slug },
      include: { author: { select: { name: true, avatar: true } } },
    }),
  ["blog-detail"],
  { revalidate: 300, tags: ["blogs"] }
);

const getRelatedBlogs = unstable_cache(
  async (blogId: string, tags: string | null) => {
    if (!tags) return [];
    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    if (tagList.length === 0) return [];
    return prisma.blog.findMany({
      where: {
        status: "PUBLISHED",
        id:     { not: blogId },
        OR:     tagList.map((tag) => ({ tags: { contains: tag } })),
      },
      select: { id: true, slug: true, title: true, excerpt: true, createdAt: true },
      take:      3,
      orderBy:   { createdAt: "desc" },
    });
  },
  ["blog-related"],
  { revalidate: 300, tags: ["blogs"] }
);

// ─── Static params — pre-render every published post at build time ────────────

export async function generateStaticParams() {
  try {
    const blogs = await prisma.blog.findMany({
      where:  { status: "PUBLISHED" },
      select: { slug: true },
    });
    return blogs.map((b) => ({ slug: b.slug }));
  } catch {
    return [];
  }
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlog(slug);
  if (!blog) return { title: "Post Not Found" };
  const pageUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://coachnest.com"}/blog/${slug}`;
  return {
    title:       blog.title,
    description: blog.excerpt ?? undefined,
    alternates:  { canonical: pageUrl },
    openGraph: {
      title:           blog.title,
      description:     blog.excerpt ?? undefined,
      images: blog.thumbnail
        ? [{ url: blog.thumbnail }]
        : [{ url: `/api/og?title=${encodeURIComponent(blog.title)}&type=blog`, width: 1200, height: 630 }],
      type:            "article",
      publishedTime:   new Date(blog.createdAt).toISOString(),
      modifiedTime:    blog.updatedAt ? new Date(blog.updatedAt).toISOString() : undefined,
      url:             pageUrl,
    },
    twitter: {
      card:        "summary_large_image",
      title:       blog.title,
      description: blog.excerpt ?? undefined,
      images: blog.thumbnail
        ? [blog.thumbnail]
        : [`/api/og?title=${encodeURIComponent(blog.title)}&type=blog`],
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://coachnest.com";

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;

  const [blog, related] = await Promise.all([
    getBlog(slug),
    getBlog(slug).then((b) => (b ? getRelatedBlogs(b.id, b.tags) : [])),
  ]);

  if (!blog || blog.status !== "PUBLISHED") notFound();

  const tagList = blog.tags?.split(",").map((t) => t.trim()).filter(Boolean) ?? [];

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: blog.title,
    description: blog.excerpt ?? undefined,
    image: blog.thumbnail ?? undefined,
    url: `${BASE_URL}/blog/${slug}`,
    datePublished: new Date(blog.createdAt).toISOString(),
    dateModified: blog.updatedAt ? new Date(blog.updatedAt).toISOString() : new Date(blog.createdAt).toISOString(),
    author: {
      "@type": "Person",
      name: blog.author.name,
    },
    publisher: {
      "@type": "Organization",
      name: "CoachNest",
      logo: { "@type": "ImageObject", url: `${BASE_URL}/logo.png` },
    },
    ...(tagList.length > 0 ? { keywords: tagList.join(", ") } : {}),
    ...(blog.readTime ? { timeRequired: `PT${blog.readTime}M` } : {}),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${BASE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: blog.title, item: `${BASE_URL}/blog/${slug}` },
    ],
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Back */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-white text-sm mb-8 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Blog
      </Link>

      {/* Cover image */}
      {blog.thumbnail && (
        <div className="relative h-56 sm:h-80 lg:h-[420px] rounded-md overflow-hidden mb-8 border border-border shadow-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={blog.thumbnail}
            alt={blog.title}
            className="w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        </div>
      )}

      {/* Tags */}
      {tagList.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {tagList.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 text-xs font-medium text-orange-300 bg-orange-500/15 px-2.5 py-1 rounded-full border border-[#d97757]/20"
            >
              <Tag className="w-3 h-3" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <h1 className="text-2xl sm:text-4xl font-bold text-white leading-tight mb-4">
        {blog.title}
      </h1>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-muted-foreground/60 text-sm mb-6 pb-6 border-b border-border">
        <span className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" />
          {blog.author.name}
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          {formatDate(blog.createdAt)}
        </span>
        {blog.readTime && (
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {blog.readTime} min read
          </span>
        )}
      </div>

      {/* Excerpt — styled callout */}
      {blog.excerpt && (
        <p className="text-muted-foreground text-base sm:text-lg leading-relaxed mb-8 italic border-l-4 border-[#d97757]/30 pl-4 py-1 bg-orange-500/[0.04] rounded-r-lg">
          {blog.excerpt}
        </p>
      )}

      {/* ── Markdown content ── */}
      <article>
        <MarkdownRenderer content={blog.content} />
      </article>

      {/* Related posts */}
      {related.length > 0 && (
        <div className="mt-14 pt-8 border-t border-border">
          <h2 className="text-xl font-bold text-white mb-6">Related Posts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {related.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`}>
                <GlassCard className="h-full hover:border-[#d97757]/25 transition-colors">
                  <h3 className="text-white font-semibold text-sm mb-2 line-clamp-2 leading-snug">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-muted-foreground/70 text-xs line-clamp-2 mb-3 leading-relaxed">
                      {post.excerpt}
                    </p>
                  )}
                  <p className="text-white/30 text-xs">{formatDate(post.createdAt)}</p>
                </GlassCard>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
