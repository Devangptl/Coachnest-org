"use client";

import BlogForm from "@/components/BlogForm";

export default function NewBlogPage() {
  return (
    <BlogForm
      mode="create"
      initial={{
        title: "",
        excerpt: "",
        content: "",
        thumbnail: "",
        tags: "",
        published: false,
      }}
    />
  );
}
