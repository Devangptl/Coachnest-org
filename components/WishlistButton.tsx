"use client";
import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Props {
  courseId:     string;
  initialState: boolean;
  className?:   string;
}

export default function WishlistButton({ courseId, initialState, className }: Props) {
  const [inWishlist, setInWishlist] = useState(initialState);
  const [loading,    setLoading]    = useState(false);

  async function toggle() {
    if (loading) return;
    setLoading(true);
    try {
      if (inWishlist) {
        await fetch(`/api/wishlist?courseId=${courseId}`, { method: "DELETE" });
        setInWishlist(false);
        toast.success("Removed from wishlist");
      } else {
        await fetch("/api/wishlist", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ courseId }),
        });
        setInWishlist(true);
        toast.success("Added to wishlist");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
      className={cn(
        "p-2 rounded-full transition-all",
        "bg-card border border-border hover:bg-secondary",
        loading && "opacity-50 cursor-wait",
        className
      )}
    >
      <Heart
        className={cn(
          "w-4 h-4 transition-colors",
          inWishlist ? "fill-red-400 text-red-400" : "text-muted-foreground"
        )}
      />
    </button>
  );
}
