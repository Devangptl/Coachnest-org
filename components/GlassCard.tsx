/**
 * GlassCard — the core glassmorphism card component.
 * Wrap any content in this for the frosted-glass look.
 */
import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Apply a more prominent glow border */
  glow?: boolean;
  /** Padding preset */
  padding?: "sm" | "md" | "lg";
}

const paddingMap = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export default function GlassCard({
  children,
  className,
  glow = false,
  padding = "md",
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        // Core glass effect
        "backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl shadow-xl",
        // Subtle inner glow on hover
        "transition-all duration-300 hover:bg-white/[0.15] hover:border-white/30",
        // Optional stronger glow
        glow && "shadow-2xl shadow-purple-500/20 border-purple-400/30",
        paddingMap[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
