"use client";

import Avatar from "./Avatar";

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

/**
 * Instructor avatar — thin wrapper around the shared {@link Avatar} so the
 * DiceBear cartoon fallback stays consistent everywhere it's used.
 */
export default function InstructorAvatar({
  name,
  avatar,
  seed,
  size = "w-10 h-10",
  className,
}: Props) {
  return <Avatar name={name} avatar={avatar} seed={seed} size={size} className={className} />;
}
