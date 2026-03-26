/**
 * Admin → All Blogs — table view with edit/delete actions.
 */
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import GlassCard from "@/components/GlassCard";
import DeleteBlogButton from "./DeleteBlogButton";
import { PlusCircle, FileText } from "lucide-react";
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Blog Posts</h1>
          <p className="text-white/50 mt-1">
            {blogs.length} post{blogs.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link href="/admin/blogs/new" className="btn-primary flex items-center gap-2 text-sm">
          <PlusCircle className="w-4 h-4" /> New Post
        </Link>
      </div>

      {blogs.length === 0 ? (
        <GlassCard className="text-center py-16">
          <FileText className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/50 mb-4">No blog posts yet.</p>
          <Link href="/admin/blogs/new" className="btn-primary inline-flex items-center gap-2 text-sm">
            <PlusCircle className="w-4 h-4" /> Create First Post
          </Link>
        </GlassCard>
      ) : (
        <GlassCard padding="sm">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-2 text-white/40 text-xs font-semibold uppercase tracking-wider border-b border-white/10">
            <div className="col-span-5">Title</div>
            <div className="col-span-2">Author</div>
            <div className="col-span-2 text-center">Date</div>
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          <div className="divide-y divide-white/5">
            {blogs.map((blog) => (
              <div
                key={blog.id}
                className="grid grid-cols-12 gap-4 px-4 py-4 items-center hover:bg-white/5 transition-colors"
              >
                <div className="col-span-5 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {blog.title}
                  </p>
                  {blog.tags && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {blog.tags.split(",").slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[10px] text-purple-300/70 bg-purple-500/10 px-1.5 py-0.5 rounded">
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="col-span-2 text-white/60 text-sm truncate">
                  {blog.author.name}
                </div>

                <div className="col-span-2 text-center text-white/50 text-xs">
                  {formatDate(blog.createdAt)}
                </div>

                <div className="col-span-1 flex justify-center">
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

                <div className="col-span-2 flex justify-end gap-2">
                  <Link
                    href={`/admin/blogs/${blog.id}/edit`}
                    className="text-xs text-white/50 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/10"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/blog/${blog.slug}`}
                    className="text-xs text-purple-400 hover:text-purple-300 transition-colors px-2 py-1 rounded-lg hover:bg-purple-500/10"
                  >
                    View
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
