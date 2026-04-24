"use client";

import BlogForm from "@/components/BlogForm";

interface Props {
  blog: {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    thumbnail: string;
    tags: string;
    status: string;
  };
}

export default function EditBlogForm({ blog }: Props) {
  return (
    <BlogForm
      mode="edit"
      initial={{
        id: blog.id,
        title: blog.title,
        slug: blog.slug,
        excerpt: blog.excerpt,
        content: blog.content,
        thumbnail: blog.thumbnail,
        tags: blog.tags,
        published: blog.status === "PUBLISHED",
      }}
    />
  );
}
