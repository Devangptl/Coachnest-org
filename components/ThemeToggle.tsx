"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

export default function ThemeToggle({ className }: Props) {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "flex items-center justify-center w-9 h-9 rounded-lg border transition-all",
        "bg-white/[0.04] border-white/[0.08] text-white/30 hover:text-white/70 hover:bg-white/[0.07] hover:border-white/[0.15]",
        className
      )}
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4" />
      ) : (
        <Moon className="w-4 h-4" />
      )}
    </button>
  );
}
