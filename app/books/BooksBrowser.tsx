"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import BookCard, { type BookVM } from "@/components/BookCard";

export default function BooksBrowser({ books }: { books: BookVM[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"newest" | "price-asc" | "price-desc" | "rating">("newest");

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = needle
      ? books.filter((b) =>
          b.title.toLowerCase().includes(needle) ||
          b.author.toLowerCase().includes(needle) ||
          (b.categoryName ?? "").toLowerCase().includes(needle))
      : [...books];

    if (sort === "price-asc") {
      list.sort((a, b) => (a.discountPrice ?? a.price ?? 0) - (b.discountPrice ?? b.price ?? 0));
    } else if (sort === "price-desc") {
      list.sort((a, b) => (b.discountPrice ?? b.price ?? 0) - (a.discountPrice ?? a.price ?? 0));
    } else if (sort === "rating") {
      list.sort((a, b) => b.avgRating - a.avgRating);
    }
    // 'newest' keeps server order (already by createdAt desc)
    return list;
  }, [books, q, sort]);

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search books, authors, categories…"
            className="h-10 w-full rounded-lg border border-white/[0.08] bg-secondary/40 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-orange-500/40 focus:outline-none"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="h-10 rounded-lg border border-white/[0.08] bg-secondary/40 px-3 text-sm text-foreground focus:border-orange-500/40 focus:outline-none"
        >
          <option value="newest">Newest first</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="rating">Top rated</option>
        </select>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/[0.08] py-16 text-center text-sm text-muted-foreground">
          {books.length === 0 ? "No books published yet — check back soon." : "No matches for your search."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
