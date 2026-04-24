"use client";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

export function Select({ value, onValueChange, options, placeholder, className }: SelectProps) {
  const currentLabel = options.find((o) => o.value === value)?.label ?? placeholder ?? "Select…";

  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      {/* ── Trigger ──────────────────────────────────────────────── */}
      <SelectPrimitive.Trigger
        className={cn(
          "group inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium",
          "bg-secondary border border-border text-foreground",
          "hover:bg-secondary/70 hover:border-border/80",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40",
          "data-[state=open]:border-orange-400/40 data-[state=open]:bg-orange-500/5",
          "transition-all select-none whitespace-nowrap",
          className
        )}
      >
        <SelectPrimitive.Value asChild>
          <span className="flex-1 text-left truncate">{currentLabel}</span>
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon asChild>
          <ChevronDown
            className="w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 flex-shrink-0"
          />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      {/* ── Portal + Content ──────────────────────────────────────── */}
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          align="end"
          className={cn(
            "z-50 min-w-[var(--radix-select-trigger-width)] max-h-72 overflow-hidden",
            "rounded-lg border border-border bg-card shadow-xl shadow-black/40",
            // open animations
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=open]:slide-in-from-top-2",
            // close animations
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          )}
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((opt) => (
              <SelectPrimitive.Item
                key={opt.value}
                value={opt.value}
                className={cn(
                  "relative flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm cursor-pointer select-none outline-none",
                  "text-muted-foreground transition-colors",
                  "hover:text-foreground hover:bg-secondary",
                  "data-[highlighted]:text-foreground data-[highlighted]:bg-secondary",
                  "data-[state=checked]:text-orange-400 data-[state=checked]:bg-orange-500/10",
                )}
              >
                <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="ml-auto">
                  <Check className="w-3.5 h-3.5 text-orange-400" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
