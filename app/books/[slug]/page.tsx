import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  BookOpen, Star, Download, Calendar, Globe, FileText, ChevronRight, Layers,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { bookDetailUrl } from "@/lib/site-urls";
import { Badge } from "@/components/ui/Badge";
import InstructorAvatar from "@/components/InstructorAvatar";
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

const FORMAT_VARIANT: Record<"PDF" | "EPUB" | "DOCX", "purple" | "amber" | "blue"> = {
  PDF:  "purple",
  EPUB: "amber",
  DOCX: "blue",
};

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

  const displayPrice = book.discountPrice
    ? Number(book.discountPrice)
    : Number(book.price ?? 0);
  const hasDiscount = book.discountPrice && book.price && Number(book.discountPrice) < Number(book.price);
  const discountPct = hasDiscount
    ? Math.round((1 - Number(book.discountPrice) / Number(book.price)) * 100)
    : 0;
  const avgRating = book.reviews.length
    ? Number((book.reviews.reduce((s, r) => s + r.rating, 0) / book.reviews.length).toFixed(1))
    : 0;

  return (
    <div className="pt-2 pb-16">
      {/* ── Full-bleed hero ─────────────────────────────────────── */}
      <div className="relative -mx-3 sm:-mx-5 lg:-mx-7 mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/[0.06] via-transparent to-transparent" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />

        <div className="relative px-3 sm:px-5 lg:px-7 pt-6 pb-10">
          {/* Breadcrumb */}
          <nav className="mb-5 flex items-center gap-1.5 text-[11px] text-muted-foreground/70 select-none">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3 flex-shrink-0" />
            <Link href="/books" className="hover:text-foreground transition-colors">Books</Link>
            {book.category && (
              <>
                <ChevronRight className="w-3 h-3 flex-shrink-0" />
                <span className="text-muted-foreground truncate max-w-[180px]">{book.category.name}</span>
              </>
            )}
          </nav>

          <div className="grid gap-6 lg:gap-10 lg:grid-cols-[260px_1fr]">
            {/* ── Cover ──────────────────────────────────────── */}
            <div className="mx-auto w-full max-w-[240px] lg:mx-0">
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-border bg-secondary/60 shadow-lg shadow-orange-500/5">
                {book.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={book.coverImage} alt={book.title} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
                    <BookOpen className="h-16 w-16" />
                  </div>
                )}
                {hasDiscount && discountPct > 0 && (
                  <div className="absolute top-2 right-2 rounded-md bg-orange-500 px-2 py-1 text-[11px] font-bold text-white">
                    -{discountPct}% OFF
                  </div>
                )}
              </div>
            </div>

            {/* ── Headline + meta ───────────────────────────── */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={FORMAT_VARIANT[book.fileFormat]} className="uppercase font-bold">
                  <FileText className="w-3 h-3" /> {book.fileFormat}
                </Badge>
                {book.category && (
                  <Link href={`/books?categoryId=${book.category.id}`} className="text-[11px] font-medium uppercase tracking-wider text-orange-500 hover:underline">
                    {book.category.name}
                  </Link>
                )}
                {book.isFree && (
                  <Badge variant="green" className="uppercase font-bold">Free</Badge>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                {book.title}
              </h1>

              {book.shortDesc && (
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {book.shortDesc}
                </p>
              )}

              {/* Author + rating */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <InstructorAvatar
                    name={book.createdBy.name}
                    avatar={book.createdBy.avatar}
                    seed={book.createdBy.id}
                    size="w-8 h-8"
                  />
                  <div className="leading-tight">
                    <p className="text-[11px] text-muted-foreground">Sold by</p>
                    <Link href={`/instructors/${book.createdBy.id}`} className="text-sm font-medium text-foreground hover:text-orange-500">
                      {book.createdBy.name}
                    </Link>
                  </div>
                </div>

                <div className="h-6 w-px bg-border" />

                <div className="leading-tight">
                  <p className="text-[11px] text-muted-foreground">Author</p>
                  <p className="text-sm font-medium text-foreground">{book.author}</p>
                </div>

                {avgRating > 0 && (
                  <>
                    <div className="h-6 w-px bg-border" />
                    <div className="leading-tight">
                      <p className="text-[11px] text-muted-foreground">Rating</p>
                      <p className="text-sm font-medium text-foreground flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        {avgRating.toFixed(1)}
                        <span className="text-muted-foreground font-normal">({book._count.reviews})</span>
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Price + action panel — mobile shows above the fold */}
              <div className="mt-4 lg:mt-6 rounded-lg border border-border bg-card p-4">
                <div className="flex items-end justify-between gap-3 mb-3">
                  <div>
                    {book.isFree ? (
                      <p className="text-3xl font-bold text-green-500 leading-none">Free</p>
                    ) : (
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-foreground leading-none">
                          ₹{displayPrice.toLocaleString("en-IN")}
                        </span>
                        {hasDiscount && (
                          <span className="text-sm text-muted-foreground line-through">
                            ₹{Number(book.price).toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {hasDiscount && (
                    <span className="rounded-md bg-orange-500/15 border border-orange-500/30 px-2 py-1 text-[11px] font-bold text-orange-600 dark:text-orange-300">
                      Save {discountPct}%
                    </span>
                  )}
                </div>

                <BookActionsClient
                  bookId={book.id}
                  slug={book.slug}
                  owned={owned}
                  isFree={book.isFree}
                  loggedIn={!!session}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body grid ───────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-8">
          {/* Preview video */}
          {book.previewVideo && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Preview</h2>
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <video
                  src={book.previewVideo}
                  controls
                  className="w-full"
                  preload="metadata"
                />
              </div>
            </section>
          )}

          {/* Description */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">About this book</h2>
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="whitespace-pre-line text-sm text-foreground/80 leading-relaxed">
                {book.description}
              </p>
            </div>
          </section>

          {/* Reviews */}
          {book.reviews.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Reviews <span className="ml-1 text-foreground">({book._count.reviews})</span>
                </h2>
                {avgRating > 0 && (
                  <span className="flex items-center gap-1 text-sm font-semibold text-amber-500">
                    <Star className="w-4 h-4 fill-amber-500" />
                    {avgRating.toFixed(1)}
                  </span>
                )}
              </div>
              <div className="space-y-2.5">
                {book.reviews.map((r) => (
                  <div key={r.id} className="rounded-lg border border-border bg-card p-4">
                    <div className="mb-1.5 flex items-center gap-2">
                      <InstructorAvatar
                        name={r.user.name}
                        avatar={r.user.avatar}
                        seed={r.user.id}
                        size="w-6 h-6"
                      />
                      <span className="text-sm font-medium text-foreground">{r.user.name}</span>
                      <span className="flex items-center gap-px text-amber-500">
                        {Array.from({ length: r.rating }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-current" />
                        ))}
                      </span>
                      <span className="ml-auto text-[11px] text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {r.comment && (
                      <p className="text-sm text-foreground/75 leading-relaxed">{r.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── Sticky details sidebar ───────────────────────────── */}
        <aside className="lg:sticky lg:top-20 h-fit">
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Details</h3>
            <ul className="space-y-2 text-sm">
              <DetailRow icon={FileText} label="Format" value={book.fileFormat} />
              <DetailRow icon={Globe} label="Language" value={book.language} />
              {book.pageCount && (
                <DetailRow icon={Layers} label="Pages" value={book.pageCount.toLocaleString()} />
              )}
              <DetailRow
                icon={Download}
                label="Downloads"
                value={book._count.purchases.toLocaleString()}
              />
              <DetailRow
                icon={Calendar}
                label="Added"
                value={new Date(book.createdAt).toLocaleDateString(undefined, {
                  year: "numeric", month: "short", day: "numeric",
                })}
              />
            </ul>

            {book.createdBy.bio && (
              <>
                <hr className="border-border my-3" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  About the seller
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {book.createdBy.bio}
                </p>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon, label, value,
}: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="font-medium text-foreground">{value}</span>
    </li>
  );
}
