import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, Library as LibraryIcon, FileText, ArrowRight } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/Badge";
import LibraryDownloadButton from "./LibraryDownloadButton";

export const metadata: Metadata = {
  title: "My Library — Coachnest",
  robots: { index: false, follow: false },
};

const FORMAT_VARIANT: Record<"PDF" | "EPUB" | "DOCX", "purple" | "amber" | "blue"> = {
  PDF:  "purple",
  EPUB: "amber",
  DOCX: "blue",
};

export default async function LibraryPage() {
  const session = await getSession();
  if (!session) redirect("/login?from=/dashboard/library");

  const purchases = await prisma.bookPurchase.findMany({
    where:   { userId: session.userId },
    orderBy: { purchasedAt: "desc" },
    include: {
      book: {
        select: {
          id: true, title: true, slug: true, author: true,
          coverImage: true, fileFormat: true, pageCount: true,
        },
      },
    },
  });

  const totalDownloads = purchases.reduce((s, p) => s + p.downloads, 0);

  return (
    <div className="pt-2 pb-16">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
          <LibraryIcon className="w-6 h-6 text-orange-500" />
          My Library
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {purchases.length === 0
            ? "Books you purchase will appear here for unlimited download."
            : `${purchases.length} book${purchases.length === 1 ? "" : "s"} · ${totalDownloads} total download${totalDownloads === 1 ? "" : "s"}`}
        </p>
      </div>

      {purchases.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/30 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/10 border border-orange-500/20">
            <BookOpen className="h-7 w-7 text-orange-500/70" />
          </div>
          <h3 className="mb-1 text-base font-semibold text-foreground">No books yet</h3>
          <p className="mb-5 text-sm text-muted-foreground">
            Browse the catalog to get started — every purchase is yours forever.
          </p>
          <Link href="/books" className="btn-primary !py-2 !px-4 !text-sm">
            Browse Books <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {purchases.map((p) => (
            <li
              key={p.id}
              className="group relative flex gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-orange-500/30"
            >
              {/* Cover */}
              <Link href={`/books/${p.book.slug}`} className="flex-shrink-0">
                <div className="h-28 w-20 overflow-hidden rounded-md border border-border bg-secondary/60">
                  {p.book.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.book.coverImage} alt={p.book.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground/30">
                      <BookOpen className="h-6 w-6" />
                    </div>
                  )}
                </div>
              </Link>

              {/* Body */}
              <div className="flex min-w-0 flex-1 flex-col">
                <Link
                  href={`/books/${p.book.slug}`}
                  className="block text-sm font-semibold text-foreground hover:text-orange-500 transition-colors line-clamp-2 leading-snug"
                >
                  {p.book.title}
                </Link>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">by {p.book.author}</p>

                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge variant={FORMAT_VARIANT[p.book.fileFormat]} className="!py-px !px-1.5 !text-[10px] uppercase">
                    <FileText className="w-2.5 h-2.5" /> {p.book.fileFormat}
                  </Badge>
                  {p.book.pageCount && (
                    <span className="text-[11px] text-muted-foreground">{p.book.pageCount}p</span>
                  )}
                  {p.downloads > 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      · {p.downloads}× downloaded
                    </span>
                  )}
                </div>

                <div className="mt-auto pt-3">
                  <LibraryDownloadButton bookId={p.book.id} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
