"use client";

import { useState } from "react";
import { UserCheck, UserPlus, UserMinus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface Props {
  instructorId:       string;
  initialIsFollowing: boolean;
  initialCount:       number;
  isLoggedIn:         boolean;
  /** Show the numeric follower count next to the label */
  showCount?:         boolean;
  className?:         string;
}

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default function FollowInstructorButton({
  instructorId,
  initialIsFollowing,
  initialCount,
  isLoggedIn,
  showCount = true,
  className,
}: Props) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [count,       setCount]       = useState(initialCount);
  const [loading,     setLoading]     = useState(false);
  const [hovered,     setHovered]     = useState(false);

  async function toggle() {
    if (loading) return;

    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    const next = !isFollowing;

    // Optimistic update
    setIsFollowing(next);
    setCount((c) => c + (next ? 1 : -1));

    setLoading(true);
    try {
      const res = await fetch(`/api/instructors/${instructorId}/follow`, {
        method: next ? "POST" : "DELETE",
      });

      if (!res.ok) {
        // Revert
        setIsFollowing(!next);
        setCount((c) => c + (next ? -1 : 1));
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Something went wrong");
        return;
      }

      const data = await res.json();
      // Sync with server count in case of race
      setCount(data.followerCount);
      toast.success(next ? "Following instructor!" : "Unfollowed");
    } catch {
      setIsFollowing(!next);
      setCount((c) => c + (next ? -1 : 1));
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // Determine icon + label based on state
  let Icon = UserPlus;
  let label = "Follow";

  if (loading) {
    Icon  = Loader2;
    label = isFollowing ? "Following" : "Follow";
  } else if (isFollowing) {
    // On hover: preview unfollow
    Icon  = hovered ? UserMinus : UserCheck;
    label = hovered ? "Unfollow" : "Following";
  }

  return (
    <button
      onClick={toggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={loading}
      aria-pressed={isFollowing}
      aria-label={isFollowing ? "Unfollow instructor" : "Follow instructor"}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border select-none",
        // Not following
        !isFollowing && !loading &&
          "bg-secondary border-border text-muted-foreground hover:border-[#d97757]/50 hover:text-foreground hover:bg-orange-500/5",
        // Following (idle)
        isFollowing && !hovered && !loading &&
          "bg-orange-500/10 border-orange-500/25 text-orange-400",
        // Following (hover — show unfollow)
        isFollowing && hovered && !loading &&
          "bg-red-500/10 border-red-400/25 text-red-400",
        loading && "opacity-60 cursor-wait",
        className,
      )}
    >
      <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", loading && "animate-spin")} />
      <span>{label}</span>
      {showCount && count > 0 && (
        <span className="opacity-60 tabular-nums">{formatCount(count)}</span>
      )}
    </button>
  );
}
