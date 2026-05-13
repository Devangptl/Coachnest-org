"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
  disabled,
}: CustomSelectProps) {
  return (
    <div className={cn("relative", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          // Reset all native browser chrome
          "appearance-none w-full",
          // Match input-glass style
          "bg-input border border-border rounded-lg px-3 py-2 pr-9",
          "text-sm text-foreground",
          "focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20",
          "hover:border-border/80 transition-all cursor-pointer",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          // Kill the native dropdown arrow on all browsers
          "[&::-ms-expand]:hidden",
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {/* Custom chevron */}
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
    </div>
  );
}
