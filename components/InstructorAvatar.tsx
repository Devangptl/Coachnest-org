"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  name: string;
  avatar?: string | null;
  /** Stable seed (instructor id) so the cartoon stays the same per person. */
  seed?: string;
  /** Tailwind size classes, e.g. "w-10 h-10". */
  size?: string;
  /** Kept for API compatibility (was the initial's text size). */
  textSize?: string;
  className?: string;
}

/** Deterministic cartoon avatar (DiceBear) used when no real photo exists. */
function cartoonUrl(seed: string) {
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(
    seed,
  )}&backgroundColor=ffd5dc,ffdfbf,c0aede,d1d4f9,b6e3f4,transparent`;
}

/** Auto-generated "initials" placeholders (seed data, etc.) are not real
 *  photos — treat them as missing so the cartoon is used instead. */
function isPlaceholder(url?: string | null) {
  if (!url || !url.trim()) return true;
  const u = url.toLowerCase();
  return (
    (u.includes("dicebear.com") && u.includes("/initials")) ||
    u.includes("ui-avatars.com") ||
    u.includes("gravatar.com/avatar")
  );
}

/**
 * Instructor avatar — shows the uploaded photo when available, otherwise a
 * random-but-stable cartoon avatar derived from the instructor id/name.
 * Falls back to the cartoon if the stored image is a placeholder or fails
 * to load.
 *
 * Uses a plain <img> (like the rest of the app) so avatars hosted on
 * domains outside next.config's remotePatterns don't crash the page.
 */
export default function InstructorAvatar({
  name,
  avatar,
  seed,
  size = "w-10 h-10",
  className,
}: Props) {
  const [errored, setErrored] = useState(false);
  const fallback = cartoonUrl(seed || name || "instructor");
  const useFallback = errored || isPlaceholder(avatar);
  const src = useFallback ? fallback : (avatar as string);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      onError={() => setErrored(true)}
      className={cn(
        size,
        "rounded-full object-cover bg-secondary ring-2 ring-border dark:ring-white/10",
        className,
      )}
    />
  );
}
