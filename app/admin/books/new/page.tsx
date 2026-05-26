import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Back to All Books
      </Link>
      <h1 className="mb-5 text-2xl font-bold text-foreground">New Book</h1>
      <BookForm categories={categories} isAdmin={true} />
    </div>
  );
}
