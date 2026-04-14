import GlassCard from "@/components/GlassCard";

export default function PayoutsAdminLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-secondary rounded-lg animate-pulse" />

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <GlassCard key={i} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary animate-pulse flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-5 w-20 bg-secondary rounded animate-pulse" />
              <div className="h-3 w-24 bg-secondary rounded animate-pulse" />
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Filter tabs skeleton */}
      <div className="flex gap-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 w-20 bg-secondary rounded-full animate-pulse" />
        ))}
      </div>

      {/* Table skeleton */}
      <GlassCard className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3 border-b border-border/50 last:border-0">
            <div className="w-10 h-10 rounded-full bg-secondary animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-secondary rounded animate-pulse" />
              <div className="h-3 w-48 bg-secondary rounded animate-pulse" />
            </div>
            <div className="h-4 w-20 bg-secondary rounded animate-pulse" />
            <div className="h-6 w-16 bg-secondary rounded-full animate-pulse" />
            <div className="h-8 w-24 bg-secondary rounded animate-pulse" />
          </div>
        ))}
      </GlassCard>
    </div>
  );
}
