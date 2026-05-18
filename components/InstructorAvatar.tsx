import Image from "next/image";
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
      <Image
        src={avatar}
        alt={name}
        width={64}
        height={64}
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
