/**
 * Admin → All Blogs — table view with edit/delete actions.
 */
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import GlassCard from "@/components/GlassCard";
import DeleteBlogButton from "./DeleteBlogButton";
import { PlusCircle, FileText, Pencil, Eye, User, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";

async function getBlogs() {
  return prisma.blog.findMany({
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export default async function AdminBlogsPage() {
  const blogs = await getBlogs();

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Blog Posts</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {blogs.length} post{blogs.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link
          href="/admin/blogs/new"
          className="btn-primary flex items-center justify-center gap-2 text-sm w-full sm:w-auto"
        >
          <PlusCircle className="w-4 h-4" /> New Post
        </Link>
      </div>

      {blogs.length === 0 ? (
        <GlassCard className="text-center py-16">
          <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No blog posts yet.</p>
          <Link href="/admin/blogs/new" className="btn-primary inline-flex items-center gap-2 text-sm">
            <PlusCircle className="w-4 h-4" /> Create First Post
          </Link>
        </GlassCard>
      ) : (
        <GlassCard padding="sm">
          {/* Table header — md+ only */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 text-muted-foreground/70 text-xs font-semibold uppercase tracking-wider border-b border-border">
            <div className="col-span-4">Title</div>
            <div className="col-span-2">Author</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>

          <div className="divide-y divide-border/50">
            {blogs.map((blog) => (
              <div
                key={blog.id}
                className="md:grid md:grid-cols-12 md:gap-4 md:items-center px-4 py-4 hover:bg-secondary transition-colors"
              >
                {/* Title + tags */}
                <div className="md:col-span-4 min-w-0">
                  <div className="flex items-start justify-between gap-2 md:block">
                    <p className="text-foreground text-sm font-medium truncate flex-1">
                      {blog.title}
                    </p>
                    {/* Status — mobile only, inline with title */}
                    <span
                      className={`md:hidden shrink-0 text-[10px] px-2 py-0.5 rounded-full border ${
                        blog.status === "PUBLISHED"
                          ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-400"
                          : "bg-yellow-500/20 border-yellow-400/30 text-yellow-400"
                      }`}
                    >
                      {blog.status === "PUBLISHED" ? "Live" : "Draft"}
                    </span>
                  </div>
                  {blog.tags && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {blog.tags.split(",").slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[10px] text-orange-300/70 bg-orange-500/10 px-1.5 py-0.5 rounded">
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Author + date — mobile only */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground md:hidden">
                    <span className="inline-flex items-center gap-1 min-w-0">
                      <User className="w-3 h-3 shrink-0" />
                      <span className="truncate">{blog.author.name}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3 shrink-0" />
                      {formatDate(blog.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="hidden md:block md:col-span-2 min-w-0 text-muted-foreground text-sm truncate">
                  {blog.author.name}
                </div>

                <div className="hidden md:block md:col-span-2 text-muted-foreground text-xs whitespace-nowrap">
                  {formatDate(blog.createdAt)}
                </div>

                <div className="hidden md:flex md:col-span-1 justify-center">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${
                      blog.status === "PUBLISHED"
                        ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-400"
                        : "bg-yellow-500/20 border-yellow-400/30 text-yellow-400"
                    }`}
                  >
                    {blog.status === "PUBLISHED" ? "Live" : "Draft"}
                  </span>
                </div>

                {/* Actions */}
                <div className="md:col-span-3 flex justify-end items-center gap-1 mt-3 md:mt-0 pt-3 md:pt-0 border-t border-border/40 md:border-0">
                  <Link
                    href={`/admin/blogs/${blog.id}/edit`}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-secondary"
                  >
                    <Pencil className="w-3 h-3" />
                    <span className="hidden md:inline">Edit</span>
                  </Link>
                  <Link
                    href={`/blog/${blog.slug}`}
                    className="inline-flex items-center gap-1 text-xs text-[#d97757] hover:text-orange-300 transition-colors px-2 py-1 rounded-lg hover:bg-orange-500/10"
                  >
                    <Eye className="w-3 h-3" />
                    <span className="hidden md:inline">View</span>
                  </Link>
                  <DeleteBlogButton blogId={blog.id} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
