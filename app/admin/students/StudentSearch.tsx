"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/Button";
import { Search, X } from "lucide-react";

export default function StudentSearch() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const qs = params.toString();
    router.push(qs ? `/admin/students?${qs}` : "/admin/students");
  };

  const handleClear = () => {
    setSearch("");
    router.push("/admin/students");
  };

  return (
    <GlassCard padding="sm">
      <div className="flex items-center gap-3 px-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search by name or email..."
            className="w-full bg-white/5 border border-white/20 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-purple-400/60 focus:bg-white/10 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button variant="primary" size="sm" onClick={handleSearch}>
          Search
        </Button>
        {search && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </GlassCard>
  );
}
