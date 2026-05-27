import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import BookForm from "@/components/admin/BookForm";

export const dynamic = "force-dynamic";

export default async function AdminNewBookPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const categories = await prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <Link
        href="/admin/books"
        className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-orange-500 transition-colors"
      >
        <ArrowLeft className="h-3 w-3" /> Back to All Books
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-foreground flex items-center gap-2.5">
        <BookOpen className="h-6 w-6 text-orange-500" />
        New Book
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Create a platform-owned title or publish on behalf of an instructor.
      </p>
      <BookForm categories={categories} isAdmin={true} />
    </div>
  );
}
