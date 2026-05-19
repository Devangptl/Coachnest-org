"use client";

/**
 * Shared pagination control for tables.
 *
 * Reads/writes the `page` and `pageSize` query params while preserving any
 * other params (filters, search, sort) already on the URL. Server components
 * read those params and fetch the matching slice, so navigation is a normal
 * App Router transition (skeleton fallback shows via the page's Suspense).
 */

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PAGE_SIZE_OPTIONS } from "@/lib/pagination";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions?: readonly number[];
};

function pageWindow(current: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  if (start > 2) pages.push("…");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < totalPages - 1) pages.push("…");
  pages.push(totalPages);
  return pages;
}

export default function Pagination({ page, pageSize, total, pageSizeOptions = PAGE_SIZE_OPTIONS }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  if (total === 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  const push = (updates: Record<string, string | undefined>) => {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    startTransition(() => router.push(`${pathname}?${sp.toString()}`));
  };

  const goTo = (p: number) => {
    if (p < 1 || p > totalPages || p === safePage) return;
    push({ page: String(p) });
  };

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-border ${
        isPending ? "opacity-60 pointer-events-none" : ""
      }`}
    >
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>
          Showing <span className="text-foreground font-medium">{from.toLocaleString()}</span>–
          <span className="text-foreground font-medium">{to.toLocaleString()}</span> of{" "}
          <span className="text-foreground font-medium">{total.toLocaleString()}</span>
        </span>
        <label className="flex items-center gap-1.5">
          <span className="hidden sm:inline">Rows</span>
          <select
            value={pageSize}
            onChange={(e) => push({ pageSize: e.target.value, page: "1" })}
            className="bg-secondary border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:border-[#d97757]/40 cursor-pointer"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => goTo(safePage - 1)}
          disabled={safePage <= 1}
          aria-label="Previous page"
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pageWindow(safePage, totalPages).map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="px-1.5 text-muted-foreground/50 text-xs select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => goTo(p)}
              aria-current={p === safePage ? "page" : undefined}
              className={`min-w-[28px] h-7 px-2 rounded-md text-xs font-medium transition-colors ${
                p === safePage
                  ? "bg-orange-500/20 text-foreground border border-[#d97757]/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {p}
            </button>
          ),
        )}

        <button
          onClick={() => goTo(safePage + 1)}
          disabled={safePage >= totalPages}
          aria-label="Next page"
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
