"use client";

import { useState, useRef, useEffect } from "react";
import {
  format, parse, parseISO, isValid,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, getYear, getMonth, setYear, setMonth,
} from "date-fns";
import { Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateTimeInputProps {
  value: string;          // "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM"
  onChange: (value: string) => void;
  type?: "date" | "datetime-local";
  placeholder?: string;
  className?: string;
  required?: boolean;
  min?: string;
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function parseValue(value: string, type: "date" | "datetime-local"): Date | null {
  if (!value) return null;
  try {
    const d = type === "date"
      ? parse(value, "yyyy-MM-dd", new Date())
      : parseISO(value);
    return isValid(d) ? d : null;
  } catch { return null; }
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
  const selected = parseValue(value, type);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Date>(selected ?? new Date());
  const [time, setTime] = useState(() => {
    if (type === "datetime-local" && selected) return format(selected, "HH:mm");
    return "00:00";
  });
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Keep view in sync when value changes externally
  useEffect(() => {
    if (selected) setView(selected);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const minDate = min ? parseValue(min, type) : null;

  const calDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(view)),
    end: endOfWeek(endOfMonth(view)),
  });

  function selectDay(day: Date) {
    if (type === "date") {
      onChange(format(day, "yyyy-MM-dd"));
      setOpen(false);
    } else {
      const [h, m] = time.split(":").map(Number);
      const dt = new Date(day);
      dt.setHours(h, m, 0, 0);
      onChange(format(dt, "yyyy-MM-dd'T'HH:mm"));
    }
  }

  function handleTimeChange(t: string) {
    setTime(t);
    if (selected) {
      const [h, m] = t.split(":").map(Number);
      const dt = new Date(selected);
      dt.setHours(h, m, 0, 0);
      onChange(format(dt, "yyyy-MM-dd'T'HH:mm"));
    }
  }

  function isDisabled(day: Date) {
    if (!minDate) return false;
    return day < minDate;
  }

  const displayLabel = selected
    ? type === "date"
      ? format(selected, "dd MMM yyyy")
      : format(selected, "dd MMM yyyy, HH:mm")
    : placeholder ?? (type === "date" ? "Pick a date" : "Pick date & time");

  return (
    <div ref={ref} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 w-full px-3 py-2 pl-9",
          "bg-input border border-border rounded-lg text-sm text-left",
          "hover:border-border/80 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20",
          "transition-all cursor-pointer",
          !selected && "text-muted-foreground",
          selected && "text-foreground",
        )}
      >
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
          {type === "datetime-local" ? <Clock className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
        </span>
        {displayLabel}
      </button>

      {/* Popover */}
      {open && (
        <div className={cn(
          "absolute z-50 mt-1 bg-card border border-border rounded-xl shadow-2xl p-3 w-64",
          "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2",
        )}>
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setView((v) => subMonths(v, 1))}
              className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1">
              {/* Month picker */}
              <select
                value={getMonth(view)}
                onChange={(e) => setView((v) => setMonth(v, Number(e.target.value)))}
                className="appearance-none bg-transparent text-sm font-semibold text-foreground cursor-pointer focus:outline-none hover:text-orange-400 transition-colors pr-1"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i} className="bg-card text-foreground">{m}</option>
                ))}
              </select>
              {/* Year picker */}
              <select
                value={getYear(view)}
                onChange={(e) => setView((v) => setYear(v, Number(e.target.value)))}
                className="appearance-none bg-transparent text-sm font-semibold text-foreground cursor-pointer focus:outline-none hover:text-orange-400 transition-colors"
              >
                {Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - 5 + i).map((y) => (
                  <option key={y} value={y} className="bg-card text-foreground">{y}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setView((v) => addMonths(v, 1))}
              className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {calDays.map((day) => {
              const outside = !isSameMonth(day, view);
              const sel = selected && isSameDay(day, selected);
              const today = isToday(day);
              const disabled = isDisabled(day);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectDay(day)}
                  className={cn(
                    "w-full aspect-square flex items-center justify-center rounded-md text-xs transition-colors",
                    outside && "text-muted-foreground/30",
                    !outside && !sel && !disabled && "hover:bg-secondary text-foreground",
                    !outside && !sel && today && "font-bold text-orange-400",
                    sel && "bg-orange-500 text-white font-semibold hover:bg-orange-500/90",
                    disabled && "opacity-30 cursor-not-allowed",
                  )}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          {/* Time picker for datetime-local */}
          {type === "datetime-local" && (
            <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                type="time"
                value={time}
                onChange={(e) => handleTimeChange(e.target.value)}
                className={cn(
                  "flex-1 bg-input border border-border rounded-md px-2 py-1 text-sm text-foreground",
                  "focus:outline-none focus:border-orange-500/50",
                  "[&::-webkit-calendar-picker-indicator]:hidden",
                  "[&::-webkit-inner-spin-button]:hidden",
                )}
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs px-2 py-1 bg-orange-500 hover:bg-orange-500/90 text-white rounded-md font-medium transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {/* Today shortcut */}
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              if (type === "date") {
                onChange(format(today, "yyyy-MM-dd"));
                setOpen(false);
              } else {
                const [h, m] = time.split(":").map(Number);
                today.setHours(h, m, 0, 0);
                onChange(format(today, "yyyy-MM-dd'T'HH:mm"));
                setView(today);
              }
            }}
            className="mt-2 w-full text-xs text-muted-foreground hover:text-orange-400 transition-colors py-1"
          >
            Today
          </button>
        </div>
      )}
    </div>
  );
}
