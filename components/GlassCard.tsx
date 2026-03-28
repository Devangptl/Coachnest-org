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
        "bg-card border border-border rounded-lg shadow-xl",
        // Subtle inner glow on hover
        "transition-all duration-300 hover:bg-secondary hover:border-border/80",
        // Optional stronger glow
        glow && "shadow-2xl shadow-orange-600/15 border-orange-400/25",
        paddingMap[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
