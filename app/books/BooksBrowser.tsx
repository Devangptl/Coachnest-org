"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, X, BookOpen } from "lucide-react";
import BookCard, { type BookVM } from "@/components/BookCard";

type Sort = "newest" | "price-asc" | "price-desc" | "rating" | "popular";

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "newest",     label: "Newest" },
  { value: "popular",    label: "Most Popular" },
  { value: "rating",     label: "Top Rated" },
  { value: "price-asc",  label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

const FORMAT_FILTERS: { value: "ALL" | "PDF" | "EPUB" | "DOCX"; label: string }[] = [
  { value: "ALL",  label: "All" },
  { value: "PDF",  label: "PDF" },
  { value: "EPUB", label: "EPUB" },
  { value: "DOCX", label: "DOCX" },
];

export default function BooksBrowser({ books }: { books: BookVM[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [format, setFormat] = useState<typeof FORMAT_FILTERS[number]["value"]>("ALL");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = books;

    if (format !== "ALL") {
      list = list.filter((b) => b.fileFormat === format);
    }
    if (needle) {
      list = list.filter((b) =>
        [b.title, b.author, b.categoryName ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(needle));
    }

    if (sort === "price-asc") {
      list = [...list].sort((a, b) => (a.discountPrice ?? a.price ?? 0) - (b.discountPrice ?? b.price ?? 0));
    } else if (sort === "price-desc") {
      list = [...list].sort((a, b) => (b.discountPrice ?? b.price ?? 0) - (a.discountPrice ?? a.price ?? 0));
    } else if (sort === "rating") {
      list = [...list].sort((a, b) => b.avgRating - a.avgRating);
    } else if (sort === "popular") {
      list = [...list].sort((a, b) => b.purchaseCount - a.purchaseCount);
    }
    return list;
  }, [books, q, sort, format]);

  return (
    <div className="pb-20">
      {/* ── Filter / search bar ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        {/* Search */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title, author, or category…"
            className="input-glass !pl-10 !pr-10 !py-2 h-10"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="input-glass !py-2 h-10 sm:w-52"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </motion.div>

      {/* ── Format pills ───────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {FORMAT_FILTERS.map((f) => {
          const active = format === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setFormat(f.value)}
              className={
                "rounded-md border px-3 py-1 text-xs font-medium transition-colors " +
                (active
                  ? "bg-orange-500/15 border-orange-500/40 text-orange-600 dark:text-orange-300"
                  : "bg-secondary/60 border-border text-muted-foreground hover:text-foreground hover:border-border/80")
              }
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* ── Result count ───────────────────────────────────────── */}
      <p className="mb-4 text-xs text-muted-foreground">
        {filtered.length} title{filtered.length !== 1 ? "s" : ""}
        {q.trim() && (
          <>
            {" "}matching <span className="text-foreground font-medium">&ldquo;{q.trim()}&rdquo;</span>
          </>
        )}
      </p>

      {/* ── Grid / empty state ─────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/30 py-16 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {books.length === 0 ? "No books published yet — check back soon." : "No matches for your filters."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-2.5">
          {filtered.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
