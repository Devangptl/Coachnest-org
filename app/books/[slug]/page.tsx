/**
 * Book detail page. Canonical URL lives on `books.<host>/<slug>` — the
 * middleware rewrites that to /books/<slug>; the apex 308-redirects.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BookOpen, Star, Download, Calendar, Globe, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { bookDetailUrl } from "@/lib/site-urls";
import BookActionsClient from "./BookActionsClient";

interface PageProps { params: Promise<{ slug: string }>; }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const book = await prisma.book.findUnique({
    where:  { slug },
    select: { title: true, shortDesc: true, description: true, coverImage: true, author: true },
  });
  if (!book) return { title: "Book not found — Coachnest" };

  const desc = book.shortDesc ?? book.description.slice(0, 160);
  const canonical = bookDetailUrl(slug);
  return {
    title: `${book.title} by ${book.author} — Coachnest`,
    description: desc,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: book.title,
      description: desc,
      images: book.coverImage ? [{ url: book.coverImage }] : undefined,
    },
  };
}

export default async function BookDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [book, session] = await Promise.all([
    prisma.book.findUnique({
      where: { slug },
      include: {
        category:  { select: { id: true, name: true, slug: true } },
        createdBy: { select: { id: true, name: true, avatar: true, bio: true } },
        reviews: {
          orderBy: { createdAt: "desc" },
          take:    20,
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
        _count: { select: { purchases: true, reviews: true } },
      },
    }),
    getSession(),
  ]);

  if (!book || book.status !== "PUBLISHED") notFound();

  const owned = session
    ? !!(await prisma.bookPurchase.findUnique({
        where: { userId_bookId: { userId: session.userId, bookId: book.id } },
        select: { id: true },
      }))
    : false;

  const displayPrice = book.discountPrice ? Number(book.discountPrice) : Number(book.price ?? 0);
  const hasDiscount = book.discountPrice && book.price && Number(book.discountPrice) < Number(book.price);
  const avgRating = book.reviews.length
    ? Number((book.reviews.reduce((s, r) => s + r.rating, 0) / book.reviews.length).toFixed(1))
    : 0;

  return (
    <div className="pt-6 pb-16 max-w-6xl mx-auto">
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        {/* Cover + buy panel */}
        <div className="space-y-4">
          <div className="aspect-[3/4] w-full overflow-hidden rounded-xl border border-white/[0.06] bg-secondary/50">
            {book.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={book.coverImage} alt={book.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground/40">
                <BookOpen className="h-16 w-16" />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-card/50 p-4 space-y-3">
            {book.isFree ? (
              <p className="text-2xl font-bold text-green-500">Free</p>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">₹{displayPrice}</span>
                {hasDiscount && (
                  <span className="text-sm text-muted-foreground line-through">₹{Number(book.price).toFixed(0)}</span>
                )}
              </div>
            )}

            <BookActionsClient
              bookId={book.id}
              slug={book.slug}
              owned={owned}
              isFree={book.isFree}
              loggedIn={!!session}
            />

            <div className="space-y-1.5 text-xs text-muted-foreground pt-3 border-t border-white/[0.06]">
              <p className="flex items-center gap-2"><FileText className="h-3.5 w-3.5" /> Format: <span className="font-medium text-foreground">{book.fileFormat}</span></p>
              <p className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> Language: <span className="font-medium text-foreground">{book.language}</span></p>
              {book.pageCount && (
                <p className="flex items-center gap-2"><BookOpen className="h-3.5 w-3.5" /> {book.pageCount} pages</p>
              )}
              <p className="flex items-center gap-2"><Download className="h-3.5 w-3.5" /> {book._count.purchases} downloads</p>
              <p className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> Added {new Date(book.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Main info */}
        <div className="space-y-6">
          {book.category && (
            <Link
              href={`/books?categoryId=${book.category.id}`}
              className="inline-block text-xs font-medium uppercase tracking-wider text-orange-500 hover:underline"
            >
              {book.category.name}
            </Link>
          )}
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight">{book.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>by <span className="font-medium text-foreground">{book.author}</span></span>
            {avgRating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-orange-500 text-orange-500" />
                {avgRating} ({book._count.reviews})
              </span>
            )}
          </div>

          {book.previewVideo && (
            <div className="overflow-hidden rounded-xl border border-white/[0.06]">
              <video src={book.previewVideo} controls className="w-full" preload="metadata" />
            </div>
          )}

          <div className="prose prose-invert max-w-none text-sm">
            <p className="whitespace-pre-line text-muted-foreground leading-relaxed">{book.description}</p>
          </div>

          {/* Seller card */}
          <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-card/50 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {book.createdBy.avatar && (
              <img src={book.createdBy.avatar} alt={book.createdBy.name} className="h-10 w-10 rounded-full object-cover" />
            )}
            <div className="text-sm">
              <p className="font-semibold text-foreground">Sold by {book.createdBy.name}</p>
              {book.createdBy.bio && (
                <p className="text-xs text-muted-foreground line-clamp-2">{book.createdBy.bio}</p>
              )}
            </div>
          </div>

          {/* Reviews */}
          {book.reviews.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Reviews</h2>
              <div className="space-y-3">
                {book.reviews.map((r) => (
                  <div key={r.id} className="rounded-lg border border-white/[0.06] bg-card/30 p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{r.user.name}</span>
                      <span className="flex items-center gap-0.5 text-xs text-orange-500">
                        {Array.from({ length: r.rating }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-orange-500" />
                        ))}
                      </span>
                    </div>
                    {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
