"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/Button";
import { Search, X } from "lucide-react";

export default function EnrollmentFiltersBar() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [expanded, setExpanded] = useState(false);

  const handleFilter = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status !== "all") params.set("status", status);

    const queryString = params.toString();
    router.push(queryString ? `/admin/enrollments?${queryString}` : "/admin/enrollments");
  };

  const handleClear = () => {
    setSearch("");
    setStatus("all");
    router.push("/admin/enrollments");
  };

  return (
    <GlassCard padding="md">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search by name or email..."
              className="input-glass w-full pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFilter()}
            />
          </div>
          <Button variant="primary" size="sm" onClick={handleFilter}>
            Filter
          </Button>
          {(search || status !== "all") && (
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {expanded && (
          <div className="space-y-3 pt-3 border-t border-white/10">
            <div>
              <label className="label">Status</label>
              <select
                className="input-glass w-full"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="DROPPED">Dropped</option>
              </select>
            </div>
          </div>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-purple-400 text-sm hover:text-purple-300 transition-colors"
        >
          {expanded ? "Hide filters" : "More filters"}
        </button>
      </div>
    </GlassCard>
  );
}
