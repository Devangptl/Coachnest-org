/**
 * Public Books & Documents catalog.
 */
import type { Metadata } from "next";
import { BookOpen, FileText, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { booksCatalogUrl } from "@/lib/site-urls";
import BooksBrowser from "./BooksBrowser";
import type { BookVM } from "@/components/BookCard";

export const metadata: Metadata = {
  title: "Books & Documents — Coachnest",
  description:
    "Browse our curated library of PDFs, EPUBs, and DOCX titles from expert instructors. Buy once, download forever.",
  alternates: { canonical: booksCatalogUrl() },
  openGraph: {
    type: "website",
    url: booksCatalogUrl(),
    title: "Books & Documents — Coachnest",
    description:
      "Browse our curated library of PDFs, EPUBs, and DOCX titles. Buy once, download forever.",
  },
};

async function getBooks() {
  return prisma.book.findMany({
    where: { status: "PUBLISHED" },
    include: {
      createdBy: { select: { id: true, name: true } },
      category:  { select: { name: true, slug: true } },
      reviews:   { select: { rating: true } },
      _count:    { select: { purchases: true, reviews: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function BooksPage() {
  const books = await getBooks();

  const vms: BookVM[] = books.map((b) => ({
    id:            b.id,
    title:         b.title,
    slug:          b.slug,
    author:        b.author,
    coverImage:    b.coverImage,
    fileFormat:    b.fileFormat,
    price:         b.price ? Number(b.price) : null,
    discountPrice: b.discountPrice ? Number(b.discountPrice) : null,
    isFree:        b.isFree,
    purchaseCount: b._count.purchases,
    reviewCount:   b._count.reviews,
    avgRating: b.reviews.length
      ? Number((b.reviews.reduce((s, r) => s + r.rating, 0) / b.reviews.length).toFixed(1))
      : 0,
    categoryName: b.category?.name ?? null,
  }));

  const totalSales = books.reduce((s, b) => s + (b._count?.purchases ?? 0), 0);
  const freeCount = books.filter((b) => b.isFree).length;

  return (
    <div className="pt-6 pb-16">
      {/* ── Hero header ─────────────────────────────────────────── */}
      <section className="relative mb-8 overflow-hidden rounded-lg border border-border bg-gradient-to-br from-orange-500/[0.06] via-card to-card p-6 sm:p-8">
        {/* Top accent line */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />

        {/* Decorative glow */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full bg-orange-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-2">
          <span className="inline-flex items-center gap-1.5 self-start rounded-md bg-orange-500/15 border border-orange-500/25 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-300">
            <Sparkles className="h-3 w-3" /> New
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-orange-500" />
            Books &amp; Documents
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Hand-picked PDFs, EPUBs, and DOCX titles from expert instructors. Buy once, download forever — no expiry, no DRM hassle.
          </p>

          {/* Quick stats */}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-orange-500/80" />
              <strong className="text-foreground font-semibold">{books.length}</strong> title{books.length !== 1 ? "s" : ""}
            </span>
            {totalSales > 0 && (
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-orange-500/80" />
                <strong className="text-foreground font-semibold">{totalSales.toLocaleString()}</strong> downloads
              </span>
            )}
            {freeCount > 0 && (
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-green-500/80" />
                <strong className="text-green-500 font-semibold">{freeCount}</strong> free
              </span>
            )}
          </div>
        </div>
      </section>

      <BooksBrowser books={vms} />
    </div>
  );
}
