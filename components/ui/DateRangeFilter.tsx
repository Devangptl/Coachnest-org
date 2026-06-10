"use client";

/**
 * DateRangeFilter — quick presets (Today / Last 7 days / …) plus a custom
 * From–To range using the DateTimeInput calendar picker.
 *
 * Two flavors:
 *  - <DateRangeFilter value onChange />  controlled; for filter bars and
 *    client-side filtered lists.
 *  - <UrlDateRangeFilter />              self-contained; reads/writes
 *    dateFrom/dateTo searchParams (resets page) for server-driven pages.
 */
import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DateTimeInput } from "@/components/ui/DateTimeInput";
import {
  DATE_PRESETS, matchPreset, presetToRange, type DateRange,
} from "@/lib/date-range";

interface DateRangeFilterProps {
  value:     DateRange;
  onChange:  (range: DateRange) => void;
  className?: string;
  /** Tighter chips/inputs for dense embeds (email logs, refunds). */
  compact?:  boolean;
}

export function DateRangeFilter({ value, onChange, className, compact = false }: DateRangeFilterProps) {
  const active = matchPreset(value);
  const hasRange = Boolean(value.from || value.to);

  function setFrom(from: string) {
    const next: DateRange = { ...value, from: from || undefined };
    if (next.from && next.to && next.from > next.to) next.to = next.from;
    onChange(next);
  }

  function setTo(to: string) {
    onChange({ ...value, to: to || undefined });
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Preset chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {DATE_PRESETS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(presetToRange(key))}
            className={cn(
              "rounded-full border font-medium transition-all",
              compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
              active === key
                ? "bg-primary/15 text-primary border-primary/30"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Custom range */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <DateTimeInput
          type="date"
          value={value.from ?? ""}
          onChange={setFrom}
          placeholder="From"
          className={cn("w-full sm:w-40", compact && "text-xs")}
        />
        <span className="hidden sm:inline text-muted-foreground/50 text-sm">–</span>
        <DateTimeInput
          type="date"
          value={value.to ?? ""}
          onChange={setTo}
          placeholder="To"
          min={value.from}
          className={cn("w-full sm:w-40", compact && "text-xs")}
        />
        {hasRange && (
          <button
            type="button"
            onClick={() => onChange({})}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors self-start sm:self-auto"
          >
            <X className="w-3.5 h-3.5" /> Clear dates
          </button>
        )}
      </div>
    </div>
  );
}

interface UrlDateRangeFilterProps {
  fromParam?: string;
  toParam?:   string;
  className?: string;
  compact?:   boolean;
}

export function UrlDateRangeFilter({
  fromParam = "dateFrom",
  toParam   = "dateTo",
  className,
  compact,
}: UrlDateRangeFilterProps) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const value: DateRange = {
    from: searchParams.get(fromParam) ?? undefined,
    to:   searchParams.get(toParam)   ?? undefined,
  };

  function handleChange(range: DateRange) {
    const sp = new URLSearchParams(searchParams.toString());
    if (range.from) sp.set(fromParam, range.from); else sp.delete(fromParam);
    if (range.to)   sp.set(toParam, range.to);     else sp.delete(toParam);
    sp.delete("page");
    const qs = sp.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  }

  return (
    <DateRangeFilter value={value} onChange={handleChange} className={className} compact={compact} />
  );
}
