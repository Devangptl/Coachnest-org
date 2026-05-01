"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Search, X } from "lucide-react";

type SortKey = "newest" | "oldest" | "name" | "earnings" | "courses";

export default function InstructorSearch({
  initialSearch = "",
  initialSort = "newest",
}: {
  initialSearch?: string;
  initialSort?: SortKey;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [sort, setSort] = useState<SortKey>(initialSort);

  const apply = (nextSearch = search, nextSort = sort) => {
    const params = new URLSearchParams();
    if (nextSearch) params.set("search", nextSearch);
    if (nextSort && nextSort !== "newest") params.set("sort", nextSort);
    const qs = params.toString();
    router.push(qs ? `/admin/instructors?${qs}` : "/admin/instructors");
  };

  const clear = () => {
    setSearch("");
    setSort("newest");
    router.push("/admin/instructors");
  };

  const hasFilters = search || sort !== "newest";

  return (
    <GlassCard padding="sm">
      <div className="flex items-center gap-3 px-2 flex-wrap">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
          <input
            type="text"
            placeholder="Search by name or email..."
            className="w-full bg-secondary border border-border rounded-md pl-10 pr-4 py-2.5 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#d97757]/25 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && apply()}
          />
        </div>

        <Select
          value={sort}
          onValueChange={(next) => { setSort(next as SortKey); apply(search, next as SortKey); }}
          options={[
            { value: "newest",   label: "Newest first"     },
            { value: "oldest",   label: "Oldest first"     },
            { value: "name",     label: "Name (A→Z)"       },
            { value: "earnings", label: "Highest earnings" },
            { value: "courses",  label: "Most courses"     },
          ]}
          className="w-auto"
        />

        <Button variant="primary" size="sm" onClick={() => apply()}>
          Search
        </Button>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clear}>
            <X className="w-4 h-4" /> Clear
          </Button>
        )}
      </div>
    </GlassCard>
  );
}
