"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface Props {
  playlistId: string;
  initialIsFollowing: boolean;
  initialCount: number;
  isLoggedIn: boolean;
  showCount?: boolean;
  className?: string;
}

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default function FollowPlaylistButton({
  playlistId,
  initialIsFollowing,
  initialCount,
  isLoggedIn,
  showCount = true,
  className,
}: Props) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (loading) return;
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    const next = !isFollowing;
    setIsFollowing(next);
    setCount((c) => c + (next ? 1 : -1));
    setLoading(true);
    try {
      const res = await fetch(`/api/playlists/${playlistId}/follow`, {
        method: next ? "POST" : "DELETE",
      });
      if (!res.ok) {
        setIsFollowing(!next);
        setCount((c) => c + (next ? -1 : 1));
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Something went wrong");
        return;
      }
      toast.success(next ? "Saved to your library" : "Removed");
    } catch {
      setIsFollowing(!next);
      setCount((c) => c + (next ? -1 : 1));
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const Icon = loading ? Loader2 : isFollowing ? BookmarkCheck : Bookmark;

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-pressed={isFollowing}
      aria-label={isFollowing ? "Unsave list" : "Save list"}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border select-none",
        !isFollowing &&
          "bg-secondary border-border text-muted-foreground hover:border-[#d97757]/50 hover:text-foreground hover:bg-orange-500/5",
        isFollowing && "bg-orange-500/10 border-orange-500/25 text-orange-400",
        loading && "opacity-60 cursor-wait",
        className,
      )}
    >
      <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", loading && "animate-spin")} />
      <span>{isFollowing ? "Saved" : "Save"}</span>
      {showCount && count > 0 && (
        <span className="opacity-60 tabular-nums">{formatCount(count)}</span>
      )}
    </button>
  );
}
