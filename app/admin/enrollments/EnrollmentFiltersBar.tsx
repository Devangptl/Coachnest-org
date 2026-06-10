"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";
import type { DateRange } from "@/lib/date-range";
import { Search, X } from "lucide-react";

export default function EnrollmentFiltersBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialRange: DateRange = {
    from: searchParams.get("dateFrom") ?? undefined,
    to:   searchParams.get("dateTo")   ?? undefined,
  };

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "all");
  const [range, setRange] = useState<DateRange>(initialRange);
  const [expanded, setExpanded] = useState(Boolean(initialRange.from || initialRange.to));

  const handleFilter = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status !== "all") params.set("status", status);
    if (range.from) params.set("dateFrom", range.from);
    if (range.to)   params.set("dateTo", range.to);

    const queryString = params.toString();
    router.push(queryString ? `/admin/enrollments?${queryString}` : "/admin/enrollments");
  };

  const handleClear = () => {
    setSearch("");
    setStatus("all");
    setRange({});
    router.push("/admin/enrollments");
  };

  return (
    <GlassCard padding="md">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
            <input
              type="text"
              placeholder="Search by name or email..."
              className="input-glass w-full pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFilter()}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="primary" size="sm" onClick={handleFilter}>
              Filter
            </Button>
            {(search || status !== "all" || range.from || range.to) && (
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {expanded && (
          <div className="space-y-3 pt-3 border-t border-border">
            <div>
              <label className="label">Status</label>
              <Select
                value={status}
                onValueChange={setStatus}
                options={[
                  { value: "all",       label: "All Statuses" },
                  { value: "ACTIVE",    label: "Active"       },
                  { value: "COMPLETED", label: "Completed"    },
                  { value: "DROPPED",   label: "Dropped"      },
                ]}
              />
            </div>
            <div>
              <label className="label">Enrolled between</label>
              <DateRangeFilter value={range} onChange={setRange} />
            </div>
          </div>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-primary text-sm hover:text-primary/80 transition-colors"
        >
          {expanded ? "Hide filters" : "More filters"}
        </button>
      </div>
    </GlassCard>
  );
}
