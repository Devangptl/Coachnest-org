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
      aria-label="Toggle theme"
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all",
        "bg-white/[0.04] border-white/[0.08] text-white/30 hover:text-white/70 hover:bg-white/[0.07] hover:border-white/[0.15]",
        className
      )}
    >
      {theme === "dark" ? (
        <>
          <Sun className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Light mode</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Dark mode</span>
        </>
      )}
    </button>
  );
}
