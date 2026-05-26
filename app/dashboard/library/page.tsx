import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, Library as LibraryIcon } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LibraryDownloadButton from "./LibraryDownloadButton";

export const metadata: Metadata = {
  title: "My Library — Coachnest",
  robots: { index: false, follow: false },
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

  return (
    <div className="pt-2 pb-16">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1 flex items-center gap-2">
          <LibraryIcon className="w-6 h-6 text-orange-500" />
          My Library
        </h1>
        <p className="text-sm text-muted-foreground">
          {purchases.length} book{purchases.length === 1 ? "" : "s"} you own — download anytime.
        </p>
      </div>

      {purchases.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/[0.08] py-16 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="mb-4 text-sm text-muted-foreground">No books yet — browse the catalog to get started.</p>
          <Link
            href="/books"
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            Browse Books
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {purchases.map((p) => (
            <li
              key={p.id}
              className="flex gap-3 rounded-xl border border-white/[0.06] bg-card/50 p-3"
            >
              <Link href={`/books/${p.book.slug}`} className="flex-shrink-0">
                <div className="h-24 w-18 overflow-hidden rounded-md bg-secondary/50">
                  {p.book.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.book.coverImage} alt={p.book.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground/40">
                      <BookOpen className="h-6 w-6" />
                    </div>
                  )}
                </div>
              </Link>
              <div className="flex flex-1 min-w-0 flex-col">
                <Link href={`/books/${p.book.slug}`} className="text-sm font-semibold text-foreground hover:text-orange-500 line-clamp-2">
                  {p.book.title}
                </Link>
                <p className="mt-0.5 text-xs text-muted-foreground">by {p.book.author}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {p.book.fileFormat} · {p.downloads} download{p.downloads === 1 ? "" : "s"}
                </p>
                <div className="mt-auto pt-2">
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
