import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import BookForm from "@/components/admin/BookForm";

export const dynamic = "force-dynamic";

interface PageProps { params: Promise<{ id: string }>; }

export default async function EditInstructorBookPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  if (!session || (session.role !== "INSTRUCTOR" && session.role !== "ADMIN")) {
    redirect("/login");
  }

  const [book, categories] = await Promise.all([
    prisma.book.findUnique({ where: { id } }),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  if (!book) notFound();
  if (book.createdById !== session.userId && session.role !== "ADMIN") redirect("/instructor/books");

  return (
    <div>
      <Link
        href="/instructor/books"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Back to My Books
      </Link>
      <h1 className="mb-5 text-2xl font-bold text-foreground">Edit Book</h1>
      <BookForm
        bookId={book.id}
        categories={categories}
        isAdmin={session.role === "ADMIN"}
        initial={{
          title:        book.title,
          slug:         book.slug,
          description:  book.description,
          shortDesc:    book.shortDesc ?? "",
          coverImage:   book.coverImage,
          previewVideo: book.previewVideo,
          author:       book.author,
          pageCount:    book.pageCount,
          language:     book.language,
          fileFormat:   book.fileFormat,
          fileUrl:      book.fileUrl,
          filePublicId: book.filePublicId,
          fileSize:     book.fileSize,
          price:        book.price ? Number(book.price) : null,
          discountPrice: book.discountPrice ? Number(book.discountPrice) : null,
          isFree:       book.isFree,
          status:       book.status === "PENDING_REVIEW" ? "DRAFT" : book.status,
          instructorRevenuePercent: book.instructorRevenuePercent,
          categoryId:   book.categoryId,
        }}
      />
    </div>
  );
}
