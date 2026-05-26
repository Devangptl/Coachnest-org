import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusCircle, BookOpen } from "lucide-react";
import { getSession } from "@/lib/auth";
import { listBooks } from "@/services/book.service";

export const dynamic = "force-dynamic";

export default async function AdminBooksPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const { items, total } = await listBooks({ pageSize: 100 });

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">All Books</h1>
          <p className="text-sm text-muted-foreground">{total} book{total === 1 ? "" : "s"} across the platform</p>
        </div>
        <Link
          href="/admin/books/new"
          className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
        >
          <PlusCircle className="h-4 w-4" /> New Book
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/[0.08] py-16 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No books yet.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((b) => (
            <li key={b.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-card/50 p-3">
              <div className="h-14 w-10 overflow-hidden rounded bg-secondary/50 flex-shrink-0">
                {b.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.coverImage} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground/40">
                    <BookOpen className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{b.title}</p>
                <p className="text-xs text-muted-foreground">
                  {b.fileFormat} · {b.status} · by {b.createdBy.name} · {b._count.purchases} sold · ₹{Number(b.discountPrice ?? b.price ?? 0)}
                </p>
              </div>
              <Link
                href={`/admin/books/${b.id}/edit`}
                className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
              >
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
