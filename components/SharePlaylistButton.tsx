"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function SharePlaylistButton({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/playlists/${slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ url, title: "Course list" });
        return;
      }
    } catch {
      /* user dismissed the share sheet — fall through to clipboard */
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy link");
    }
  }

  return (
    <button
      onClick={share}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-[#d97757]/50 transition-all",
        className,
      )}
      aria-label="Share this list"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <Share2 className="w-3.5 h-3.5" />
      )}
      <span>{copied ? "Copied" : "Share"}</span>
    </button>
  );
}
