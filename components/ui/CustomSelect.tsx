"use client";

import * as Select from "@radix-ui/react-select";
import { ChevronDown, Check } from "lucide-react";
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
    <Select.Root value={value} onValueChange={onChange} disabled={disabled}>
      <Select.Trigger
        className={cn(
          "flex items-center justify-between w-full",
          "bg-input border border-border rounded-lg px-3 py-2",
          "text-sm text-foreground",
          "focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20",
          "hover:border-border/80 transition-all cursor-pointer",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "data-[placeholder]:text-muted-foreground",
          className,
        )}
      >
        <Select.Value placeholder={placeholder} />
        <Select.Icon>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={4}
          className={cn(
            "z-50 w-[var(--radix-select-trigger-width)] min-w-[8rem]",
            "bg-card border border-border rounded-lg shadow-xl",
            "overflow-hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
          )}
        >
          <Select.Viewport className="p-1">
            {options.map((o) => (
              <Select.Item
                key={o.value}
                value={o.value}
                className={cn(
                  "relative flex items-center gap-2 px-3 py-2 rounded-md",
                  "text-sm text-foreground cursor-pointer select-none outline-none",
                  "hover:bg-secondary focus:bg-secondary transition-colors",
                  "data-[state=checked]:text-orange-400",
                )}
              >
                <Select.ItemText>{o.label}</Select.ItemText>
                <Select.ItemIndicator className="ml-auto">
                  <Check className="w-3.5 h-3.5 text-orange-400" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
