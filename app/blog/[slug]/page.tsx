/**
 * Public Blog detail page — renders a single blog post.
 */
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, Clock, User, Calendar, Tag } from "lucide-react";
import GlassCard from "@/components/GlassCard";

interface Props {
  params: Promise<{ slug: string }>;
}

async function getBlog(slug: string) {
  return prisma.blog.findUnique({
    where: { slug },
    include: { author: { select: { name: true, avatar: true } } },
  });
}

async function getRelatedBlogs(blogId: string, tags: string | null) {
  if (!tags) return [];
  const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
  if (tagList.length === 0) return [];

  return prisma.blog.findMany({
    where: {
      status: "PUBLISHED",
      id: { not: blogId },
      OR: tagList.map((tag) => ({ tags: { contains: tag } })),
    },
    select: { id: true, slug: true, title: true, excerpt: true, createdAt: true },
    take: 3,
    orderBy: { createdAt: "desc" },
  });
}

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;
  const blog = await getBlog(slug);
  if (!blog || blog.status !== "PUBLISHED") notFound();

  const related = await getRelatedBlogs(blog.id, blog.tags);
  const tagList = blog.tags?.split(",").map((t) => t.trim()).filter(Boolean) ?? [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-white text-sm mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Blog
      </Link>

      {/* Cover image */}
      {blog.thumbnail && (
        <div className="relative h-64 sm:h-80 rounded-lg overflow-hidden mb-8 border border-border">
          <img
            src={blog.thumbnail}
            alt={blog.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      )}

      {/* Tags */}
      {tagList.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {tagList.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 text-xs font-medium text-orange-300 bg-orange-500/15 px-2.5 py-1 rounded-full border border-orange-400/20"
            >
              <Tag className="w-3 h-3" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
        {blog.title}
      </h1>

      {/* Meta */}
      <div className="flex items-center gap-4 text-muted-foreground/70 text-sm mb-8 pb-8 border-b border-border">
        <span className="flex items-center gap-1.5">
          <User className="w-4 h-4" />
          {blog.author.name}
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          {formatDate(blog.createdAt)}
        </span>
        {blog.readTime && (
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {blog.readTime} min read
          </span>
        )}
      </div>

      {/* Excerpt */}
      {blog.excerpt && (
        <p className="text-muted-foreground text-lg leading-relaxed mb-8 italic border-l-4 border-orange-400/25 pl-4">
          {blog.excerpt}
        </p>
      )}

      {/* Content */}
      <article className="prose prose-invert prose-purple max-w-none
        prose-headings:text-white prose-headings:font-bold
        prose-p:text-muted-foreground prose-p:leading-relaxed
        prose-a:text-orange-400 prose-a:no-underline hover:prose-a:text-orange-300
        prose-strong:text-white
        prose-code:text-orange-300 prose-code:bg-secondary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
        prose-pre:bg-white/[0.06] prose-pre:border prose-pre:border-border prose-pre:rounded-xl
        prose-blockquote:border-orange-400/25 prose-blockquote:text-muted-foreground
        prose-li:text-muted-foreground
        prose-img:rounded-xl prose-img:border prose-img:border-border
      ">
        <div dangerouslySetInnerHTML={{ __html: blog.content }} />
      </article>

      {/* Related posts */}
      {related.length > 0 && (
        <div className="mt-16 pt-8 border-t border-border">
          <h2 className="text-xl font-bold text-white mb-6">Related Posts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {related.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`}>
                <GlassCard className="h-full hover:border-orange-400/25">
                  <h3 className="text-white font-semibold text-sm mb-2 line-clamp-2">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-muted-foreground/70 text-xs line-clamp-2 mb-2">{post.excerpt}</p>
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
