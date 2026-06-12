/**
 * Date-range filter helpers — shared by the DateRangeFilter component and
 * client-side list filtering. All math is done in local time with date-fns,
 * matching the startOfDay/endOfDay(parseISO(...)) semantics the services use.
 */
import {
  format, parseISO, subDays, startOfMonth, startOfDay, endOfDay, isValid,
} from "date-fns";

/** Both bounds are "yyyy-MM-dd" strings; either side may be open. */
export type DateRange = { from?: string; to?: string };

export type PresetKey = "today" | "last7" | "last30" | "thisMonth" | "all";

export const DATE_PRESETS: { key: PresetKey; label: string }[] = [
  { key: "today",     label: "Today" },
  { key: "last7",     label: "Last 7 days" },
  { key: "last30",    label: "Last 30 days" },
  { key: "thisMonth", label: "This month" },
  { key: "all",       label: "All time" },
];

const DAY = "yyyy-MM-dd";

export function presetToRange(key: PresetKey, now: Date = new Date()): DateRange {
  const today = format(now, DAY);
  switch (key) {
    case "today":     return { from: today, to: today };
    case "last7":     return { from: format(subDays(now, 6), DAY), to: today };
    case "last30":    return { from: format(subDays(now, 29), DAY), to: today };
    case "thisMonth": return { from: format(startOfMonth(now), DAY), to: today };
    case "all":       return {};
  }
}

/** Which preset (if any) the current range corresponds to — drives chip highlighting. */
export function matchPreset(range: DateRange, now: Date = new Date()): PresetKey | "custom" {
  if (!range.from && !range.to) return "all";
  for (const { key } of DATE_PRESETS) {
    if (key === "all") continue;
    const p = presetToRange(key, now);
    if (p.from === range.from && p.to === range.to) return key;
  }
  return "custom";
}

/** Prisma-ready { gte, lte } bounds for a yyyy-MM-dd range; undefined when empty. */
export function toDateBounds(
  dateFrom?: string,
  dateTo?: string
): { gte?: Date; lte?: Date } | undefined {
  if (!dateFrom && !dateTo) return undefined;
  return {
    ...(dateFrom && { gte: startOfDay(parseISO(dateFrom)) }),
    ...(dateTo && { lte: endOfDay(parseISO(dateTo)) }),
  };
}

/** True when `date` falls inside the (inclusive, whole-day) range. */
export function isWithinRange(date: Date | string, range: DateRange): boolean {
  if (!range.from && !range.to) return true;
  const d = typeof date === "string" ? new Date(date) : date;
  if (!isValid(d)) return false;
  if (range.from && d < startOfDay(parseISO(range.from))) return false;
  if (range.to && d > endOfDay(parseISO(range.to))) return false;
  return true;
}
