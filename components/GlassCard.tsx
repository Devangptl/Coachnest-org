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
  sm: "p-3",
  md: "p-5",
  lg: "p-6",
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
        "bg-card border border-border rounded-lg",
        // Subtle inner glow on hover
        "transition-all duration-300 hover:shadow-glow",
        // Optional stronger glow
        glow && "",
        paddingMap[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
