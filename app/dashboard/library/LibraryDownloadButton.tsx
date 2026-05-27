"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

export default function LibraryDownloadButton({ bookId }: { bookId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${bookId}/download`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Download failed");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={busy}
        className="flex w-full items-center justify-center gap-1.5 rounded-md bg-orange-500/10 border border-orange-500/25 px-3 py-1.5 text-xs font-semibold text-orange-600 dark:text-orange-300 hover:bg-orange-500/20 hover:border-orange-500/40 transition-colors disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
        {busy ? "Preparing…" : "Download"}
      </button>
      {error && <p className="mt-1 text-[10px] text-red-400">{error}</p>}
    </>
  );
}
