"use client";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  /** Flat list of options */
  options?: SelectOption[];
  /** Grouped options — renders a labelled section per group */
  groups?: SelectGroup[];
  /** Shown in the trigger when no value is selected; also adds a reset item in the dropdown */
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// ── Shared item styles ────────────────────────────────────────────────────────
const itemCls = cn(
  "relative flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm cursor-pointer select-none outline-none",
  "text-muted-foreground transition-colors",
  "hover:text-foreground hover:bg-secondary",
  "data-[highlighted]:text-foreground data-[highlighted]:bg-secondary",
  "data-[state=checked]:text-orange-400 data-[state=checked]:bg-orange-500/10",
);

function Item({ value, label }: SelectOption) {
  return (
    <SelectPrimitive.Item value={value} className={itemCls}>
      <SelectPrimitive.ItemText>{label}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="ml-auto flex-shrink-0">
        <Check className="w-3.5 h-3.5 text-orange-400" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

export function Select({
  value, onValueChange, options, groups, placeholder, className, disabled,
}: SelectProps) {
  // Resolve the displayed label for the trigger
  const allFlat: SelectOption[] = [
    ...(placeholder ? [{ value: "", label: placeholder }] : []),
    ...(options ?? []),
    ...(groups?.flatMap((g) => g.options) ?? []),
  ];
  const currentLabel = allFlat.find((o) => o.value === value)?.label
    ?? placeholder
    ?? "Select…";

  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      {/* ── Trigger ─────────────────────────────────────────────────── */}
      <SelectPrimitive.Trigger
        className={cn(
          "group inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium",
          "bg-secondary border border-border text-foreground",
          "hover:bg-secondary/70 hover:border-border/80",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40",
          "data-[state=open]:border-orange-400/40 data-[state=open]:bg-orange-500/5",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-all select-none",
          className,
        )}
      >
        <SelectPrimitive.Value asChild>
          <span className="flex-1 text-left truncate">{currentLabel}</span>
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      {/* ── Portal + Content ─────────────────────────────────────────── */}
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          align="start"
          className={cn(
            "z-[200] min-w-[var(--radix-select-trigger-width)] max-h-72 overflow-hidden",
            "rounded-lg border border-border bg-card shadow-xl shadow-black/40",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-2",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          )}
        >
          <SelectPrimitive.Viewport className="p-1">
            {/* Reset item — Radix forbids value="", so we use a button outside SelectPrimitive.Item */}
            {placeholder && (
              <div
                role="option"
                aria-selected={value === ""}
                onClick={() => onValueChange("")}
                className={itemCls + (value === "" ? " text-orange-400 bg-orange-500/10" : "")}
              >
                <span className="flex-1">{placeholder}</span>
                {value === "" && <Check className="ml-auto w-3.5 h-3.5 text-orange-400 flex-shrink-0" />}
              </div>
            )}

            {/* Flat options */}
            {options?.map((opt) => <Item key={opt.value} {...opt} />)}

            {/* Grouped options */}
            {groups?.map((group) => (
              <SelectPrimitive.Group key={group.label}>
                <SelectPrimitive.Label className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                  {group.label}
                </SelectPrimitive.Label>
                {group.options.map((opt) => <Item key={opt.value} {...opt} />)}
              </SelectPrimitive.Group>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
