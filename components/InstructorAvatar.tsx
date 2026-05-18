import { cn } from "@/lib/utils";

interface Props {
  name: string;
  avatar?: string | null;
  /** Tailwind size classes, e.g. "w-10 h-10". */
  size?: string;
  /** Text size class for the fallback initial. */
  textSize?: string;
  className?: string;
}

/**
 * Instructor avatar — shows the photo when available, otherwise a gradient
 * circle with the name's first initial (matches the course hero style).
 *
 * Uses a plain <img> (like the rest of the app) so avatars hosted on
 * domains outside next.config's remotePatterns don't crash the page.
 */
export default function InstructorAvatar({
  name,
  avatar,
  size = "w-10 h-10",
  textSize = "text-sm",
  className,
}: Props) {
  if (avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatar}
        alt={name}
        className={cn(
          size,
          "rounded-full object-cover ring-2 ring-border dark:ring-white/10",
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        size,
        textSize,
        "rounded-full bg-gradient-to-br from-primary via-orange-400 to-amber-500 flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-border dark:ring-white/10",
        className,
      )}
      aria-hidden
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
