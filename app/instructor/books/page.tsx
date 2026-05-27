import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusCircle, BookOpen, FileText, Download, Pencil } from "lucide-react";
import { getSession } from "@/lib/auth";
import { listBooks } from "@/services/book.service";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

const STATUS_VARIANT = {
  DRAFT:          "gray",
  PUBLISHED:      "green",
  ARCHIVED:       "outline",
  PENDING_REVIEW: "amber",
} as const;

export default async function InstructorBooksPage() {
  const session = await getSession();
  if (!session || (session.role !== "INSTRUCTOR" && session.role !== "ADMIN")) {
    redirect("/login");
  }

  const { items, total } = await listBooks({
    createdById: session.userId,
    pageSize: 50,
  });

  const totalSales = items.reduce((s, b) => s + (b._count?.purchases ?? 0), 0);

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-orange-500" />
            My Books
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} book{total === 1 ? "" : "s"}
            {totalSales > 0 && ` · ${totalSales} total sales`}
          </p>
        </div>
        <Link href="/instructor/books/new" className="btn-primary !py-2 !px-3 !text-sm self-start sm:self-auto">
          <PlusCircle className="h-4 w-4" /> New Book
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/30 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/10 border border-orange-500/20">
            <BookOpen className="h-7 w-7 text-orange-500/70" />
          </div>
          <h3 className="mb-1 text-base font-semibold text-foreground">No books yet</h3>
          <p className="mb-5 text-sm text-muted-foreground">
            Upload a PDF, EPUB, or DOCX and start selling — Coachnest handles compression and delivery.
          </p>
          <Link href="/instructor/books/new" className="btn-primary !py-2 !px-4 !text-sm">
            <PlusCircle className="h-4 w-4" /> Create your first book
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((b) => {
            const displayPrice = b.discountPrice ?? b.price;
            return (
              <li
                key={b.id}
                className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-orange-500/30"
              >
                <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded border border-border bg-secondary/60">
                  {b.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.coverImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground/30">
                      <BookOpen className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground group-hover:text-orange-500 transition-colors">
                    {b.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <Badge variant={STATUS_VARIANT[b.status]} className="!py-px !text-[10px]">
                      {b.status}
                    </Badge>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" /> {b.fileFormat}
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="h-3 w-3" /> {b._count.purchases}
                    </span>
                    {displayPrice != null && (
                      <span className="font-medium text-foreground">
                        ₹{Number(displayPrice).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/instructor/books/${b.id}/edit`}
                  className="btn-ghost !text-xs"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
