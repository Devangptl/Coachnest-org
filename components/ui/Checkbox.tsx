"use client";

import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  indeterminate?: boolean;
  disabled?: boolean;
  label?: string;
  description?: string;
  className?: string;
  id?: string;
}

export function Checkbox({
  checked,
  onChange,
  indeterminate = false,
  disabled = false,
  label,
  description,
  className,
  id,
}: CheckboxProps) {
  const uid = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <label
      htmlFor={uid}
      className={cn(
        "flex items-start gap-3 cursor-pointer group",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      <div className="relative mt-0.5 shrink-0">
        {/* Hidden native checkbox for a11y / form submission */}
        <input
          id={uid}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        {/* Custom box */}
        <div
          className={cn(
            "w-4 h-4 rounded border transition-all flex items-center justify-center",
            checked || indeterminate
              ? "bg-amber-500 border-amber-500"
              : "bg-input border-border group-hover:border-amber-400/60",
          )}
        >
          {indeterminate ? (
            <Minus className="w-2.5 h-2.5 text-white" strokeWidth={3} />
          ) : checked ? (
            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
          ) : null}
        </div>
      </div>

      {(label || description) && (
        <div className="min-w-0">
          {label && (
            <span className="text-sm font-medium leading-none">{label}</span>
          )}
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      )}
    </label>
  );
}
