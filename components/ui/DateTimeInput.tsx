"use client";

import { Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateTimeInputProps {
  value: string;
  onChange: (value: string) => void;
  type?: "date" | "datetime-local";
  placeholder?: string;
  className?: string;
  required?: boolean;
  min?: string;
}

export function DateTimeInput({
  value,
  onChange,
  type = "date",
  placeholder,
  className,
  required,
  min,
}: DateTimeInputProps) {
  return (
    <div className={cn("relative", className)}>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        min={min}
        placeholder={placeholder}
        className={cn(
          // Reset native browser calendar icon / styling
          "appearance-none w-full",
          "[&::-webkit-calendar-picker-indicator]:hidden",
          "[&::-webkit-inner-spin-button]:hidden",
          "[&::-webkit-clear-button]:hidden",
          // Match input-glass style
          "bg-input border border-border rounded-lg pl-9 pr-3 py-2",
          "text-sm text-foreground",
          "focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20",
          "hover:border-border/80 transition-all cursor-pointer",
          // Make empty state show muted placeholder color
          "invalid:text-muted-foreground",
          // On some browsers the value color needs forcing
          "empty:text-muted-foreground",
        )}
      />
      {/* Left icon */}
      <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
        {type === "datetime-local"
          ? <Clock className="w-4 h-4" />
          : <Calendar className="w-4 h-4" />}
      </div>
    </div>
  );
}
