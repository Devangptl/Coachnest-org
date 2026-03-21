/**
 * Global loading skeleton — shown during top-level route transitions.
 * Shimmer animation with glassmorphism cards.
 */
export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      {/* Hero skeleton */}
      <div className="mb-12">
        <Shimmer className="h-12 w-80 rounded-xl mb-4" />
        <Shimmer className="h-5 w-96 rounded-lg mb-2" />
        <Shimmer className="h-5 w-64 rounded-lg" />
        <div className="flex gap-3 mt-6">
          <Shimmer className="h-12 w-40 rounded-xl" />
          <Shimmer className="h-12 w-36 rounded-xl" />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="backdrop-blur-lg bg-white/[0.06] border border-white/10 rounded-2xl p-5 flex items-center gap-4"
          >
            <Shimmer className="w-12 h-12 rounded-xl" />
            <div className="space-y-2 flex-1">
              <Shimmer className="h-7 w-16 rounded-lg" />
              <Shimmer className="h-3 w-20 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Section heading */}
      <Shimmer className="h-7 w-48 rounded-lg mb-6" />

      {/* Card grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} delay={i * 0.05} />
        ))}
      </div>
    </div>
  );
}

function CardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="backdrop-blur-lg bg-white/[0.06] border border-white/10 rounded-2xl overflow-hidden"
      style={{ animationDelay: `${delay}s` }}
    >
      <Shimmer className="h-44 w-full rounded-none" />
      <div className="p-5 space-y-3">
        <Shimmer className="h-5 w-4/5 rounded-lg" />
        <Shimmer className="h-3 w-full rounded-lg" />
        <Shimmer className="h-3 w-3/4 rounded-lg" />
        <div className="flex items-center justify-between pt-2">
          <Shimmer className="h-3 w-20 rounded" />
          <Shimmer className="h-3 w-16 rounded" />
        </div>
      </div>
    </div>
  );
}

export function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden bg-white/[0.06] ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
    </div>
  );
}
