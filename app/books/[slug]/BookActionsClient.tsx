"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, ShoppingCart, BookOpen, Download, Lock, Check } from "lucide-react";
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
  const [feedback, setFeedback] = useState<{ kind: "err" | "ok"; msg: string } | null>(null);

  async function handleDownload() {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/books/${bookId}/download`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Download failed");
      window.location.href = data.url;
    } catch (e) {
      setFeedback({ kind: "err", msg: e instanceof Error ? e.message : "Download failed" });
      setBusy(false);
    }
  }

  async function handleAdd() {
    if (!loggedIn) {
      router.push(`/login?from=/books`);
      return;
    }
    setBusy(true);
    setFeedback(null);
    const result = await add(bookId);
    setBusy(false);
    if (!result.ok) {
      setFeedback({ kind: "err", msg: result.error });
    } else {
      setFeedback({ kind: "ok", msg: "Added to cart" });
      setTimeout(() => router.push("/cart"), 600);
    }
  }

  if (owned) {
    return (
      <div className="space-y-2">
        <button
          onClick={handleDownload}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-green-500/15 border border-green-500/30 px-4 py-2.5 text-sm font-semibold text-green-500 hover:bg-green-500/25 transition-colors disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download Now
        </button>
        <Link
          href="/dashboard/library"
          className="flex w-full items-center justify-center gap-1.5 text-[12px] text-muted-foreground hover:text-orange-500 transition-colors"
        >
          View in My Library →
        </Link>
        <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
          <Check className="w-3 h-3 text-green-500" />
          You own this book
        </p>
        {feedback && (
          <p className={feedback.kind === "err" ? "text-xs text-red-400" : "text-xs text-green-500"}>
            {feedback.msg}
          </p>
        )}
      </div>
    );
  }

  if (isFree) {
    return (
      <button
        onClick={handleDownload}
        disabled={busy}
        className="btn-primary !w-full !py-2.5 !text-sm justify-center"
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
        className="btn-primary !w-full !py-2.5 !text-sm justify-center"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : !loggedIn ? (
          <Lock className="h-4 w-4" />
        ) : (
          <ShoppingCart className="h-4 w-4" />
        )}
        {!loggedIn ? "Sign in to buy" : "Add to Cart"}
      </button>
      <p className="text-center text-[11px] text-muted-foreground">
        🔒 Secure checkout via Razorpay · Lifetime download
      </p>
      {feedback && (
        <p className={feedback.kind === "err" ? "text-xs text-red-400" : "text-xs text-green-500"}>
          {feedback.msg}
        </p>
      )}
    </div>
  );
}
