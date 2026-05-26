/**
 * Public Books & Documents catalog.
 *
 * Served at both:
 *   - apex/<host>/books        — direct URL (308 redirects to books subdomain in prod)
 *   - books.<host>/            — middleware-rewritten subdomain entry point
 */
import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
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

  return (
    <div className="pt-6 pb-16">
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-orange-500" />
          Books & Documents
        </h1>
        <p className="text-muted-foreground text-sm">
          {books.length} title{books.length !== 1 ? "s" : ""} · PDF, EPUB, DOCX — buy once, download forever.
        </p>
      </div>

      <BooksBrowser books={vms} />
    </div>
  );
}
