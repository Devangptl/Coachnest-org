/**
 * Admin panel loading skeleton.
 */
export default function AdminLoading() {
  return (
    <div className="flex gap-8 animate-pulse">
      {/* Sidebar skeleton */}
      <div className="w-64 flex-shrink-0">
        <div className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl p-4 space-y-2">
          <div className="h-3 w-20 bg-white/10 rounded mb-4" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex-1 space-y-6">
        <div className="h-9 w-56 bg-white/10 rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl p-6 h-24"
            />
          ))}
        </div>
        <div className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl h-72" />
      </div>
    </div>
  );
}
