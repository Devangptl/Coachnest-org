import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EditBlogForm from "./EditBlogForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditBlogPage({ params }: Props) {
  const { id } = await params;
  const blog = await prisma.blog.findUnique({ where: { id } });
  if (!blog) notFound();

  return (
    <EditBlogForm
      blog={{
        id: blog.id,
        title: blog.title,
        slug: blog.slug,
        excerpt: blog.excerpt ?? "",
        content: blog.content,
        thumbnail: blog.thumbnail ?? "",
        tags: blog.tags ?? "",
        status: blog.status,
      }}
    />
  );
}
