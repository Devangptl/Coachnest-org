"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type Theme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

const CYCLE: Theme[] = ["system", "light", "dark"];

const ICONS = {
  dark:   Moon,
  light:  Sun,
  system: Monitor,
};

const LABELS = {
  dark:   "Switch to light mode",
  light:  "Switch to system theme",
  system: "Switch to dark mode",
};

interface Props {
  className?: string;
}

export default function ThemeToggle({ className }: Props) {
  const { theme, setTheme } = useTheme();

  function cycle() {
    const idx = CYCLE.indexOf(theme);
    setTheme(CYCLE[(idx + 1) % CYCLE.length]);
  }

  const Icon = ICONS[theme];

  return (
    <button
      onClick={cycle}
      aria-label={LABELS[theme]}
      className={cn(
        "flex items-center justify-center w-9 h-9 transition-all",
        "text-white/30",
        className
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
