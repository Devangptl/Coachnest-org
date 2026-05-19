"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  name: string;
  avatar?: string | null;
  /** Stable seed (instructor id) so the colour stays the same per person. */
  seed?: string;
  /** Tailwind size classes, e.g. "w-10 h-10". */
  size?: string;
  /** Tailwind text size class for the initials, e.g. "text-sm". */
  textSize?: string;
  className?: string;
}

/** Auto-generated "initials" placeholders (seed data, etc.) are not real
 *  photos — treat them as missing so the text avatar is used instead. */
function isPlaceholder(url?: string | null) {
  if (!url || !url.trim()) return true;
  const u = url.toLowerCase();
  return (
    (u.includes("dicebear.com") && u.includes("/initials")) ||
    u.includes("ui-avatars.com") ||
    u.includes("gravatar.com/avatar")
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic background colour derived from the seed/name. */
const PALETTE = [
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-sky-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-fuchsia-500",
];

function colorFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

/**
 * Instructor avatar — shows the uploaded photo when available, otherwise a
 * simple text avatar showing the person's initials on a stable colour
 * derived from their id/name. Falls back to the text avatar if the stored
 * image is a placeholder or fails to load.
 *
 * Uses a plain <img> (like the rest of the app) so avatars hosted on
 * domains outside next.config's remotePatterns don't crash the page.
 */
export default function InstructorAvatar({
  name,
  avatar,
  seed,
  size = "w-10 h-10",
  textSize = "text-sm",
  className,
}: Props) {
  const [errored, setErrored] = useState(false);
  const useFallback = errored || isPlaceholder(avatar);

  if (useFallback) {
    const key = seed || name || "instructor";
    return (
      <div
        aria-label={name}
        title={name}
        className={cn(
          size,
          colorFor(key),
          "rounded-full flex items-center justify-center select-none",
          "text-white font-semibold ring-2 ring-border dark:ring-white/10",
          textSize,
          className,
        )}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatar as string}
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
