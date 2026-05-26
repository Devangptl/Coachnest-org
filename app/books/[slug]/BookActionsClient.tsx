"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, ShoppingCart, BookOpen, Download } from "lucide-react";
import { useCart } from "@/hooks/useCart";

interface Props {
  bookId:   string;
  slug:     string;
  owned:    boolean;
  isFree:   boolean;
  loggedIn: boolean;
}

export default function BookActionsClient({ bookId, owned, isFree, loggedIn }: Props) {
  const router = useRouter();
  const { add } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setBusy(true);
    try {
      const res = await fetch(`/api/books/${bookId}/download`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Download failed");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd() {
    if (!loggedIn) {
      router.push(`/login?from=/books`);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await add(bookId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
    } else {
      router.push("/cart");
    }
  }

  if (owned) {
    return (
      <div className="space-y-2">
        <button
          onClick={handleDownload}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-500/15 px-4 py-2.5 text-sm font-semibold text-green-500 hover:bg-green-500/25 transition-colors disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download
        </button>
        <Link
          href="/dashboard/library"
          className="block w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          View in My Library →
        </Link>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  if (isFree) {
    return (
      <button
        onClick={handleDownload}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
        Read for Free
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleAdd}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
        Add to Cart
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
