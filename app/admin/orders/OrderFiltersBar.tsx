"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";
import type { DateRange } from "@/lib/date-range";
import { Search, X } from "lucide-react";

export default function OrderFiltersBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "all");
  const [range, setRange] = useState<DateRange>({
    from: searchParams.get("dateFrom") ?? undefined,
    to:   searchParams.get("dateTo")   ?? undefined,
  });

  const handleFilter = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status !== "all") params.set("status", status);
    if (range.from) params.set("dateFrom", range.from);
    if (range.to)   params.set("dateTo", range.to);
    const qs = params.toString();
    router.push(qs ? `/admin/orders?${qs}` : "/admin/orders");
  };

  const handleClear = () => {
    setSearch("");
    setStatus("all");
    setRange({});
    router.push("/admin/orders");
  };

  return (
    <GlassCard padding="md">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
            <input
              type="text"
              placeholder="Search by order ID, student name, or email..."
              className="input-glass w-full pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFilter()}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={status}
              onValueChange={setStatus}
              options={[
                { value: "all",      label: "All Statuses" },
                { value: "PAID",     label: "Paid"         },
                { value: "PENDING",  label: "Pending"      },
                { value: "FAILED",   label: "Failed"       },
                { value: "REFUNDED", label: "Refunded"     },
              ]}
              className="w-auto"
            />
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

        <DateRangeFilter value={range} onChange={setRange} />
      </div>
    </GlassCard>
  );
}
