/**
 * Dashboard loading skeleton — matches the dashboard layout.
 */
export default function DashboardLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 animate-pulse">
      {/* Greeting */}
      <div className="mb-10">
        <div className="h-10 w-72 bg-white/10 rounded-xl mb-2" />
        <div className="h-4 w-48 bg-white/5 rounded-lg" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl p-6 flex items-center gap-4"
          >
            <div className="w-11 h-11 rounded-xl bg-white/10" />
            <div className="space-y-2">
              <div className="h-7 w-12 bg-white/10 rounded-lg" />
              <div className="h-3 w-20 bg-white/5 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Section label */}
      <div className="h-6 w-40 bg-white/10 rounded-lg mb-5" />

      {/* Course cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl overflow-hidden"
          >
            <div className="h-44 bg-white/10" />
            <div className="p-5 space-y-3">
              <div className="h-5 bg-white/10 rounded-lg w-4/5" />
              <div className="h-3 bg-white/5 rounded-lg w-full" />
              <div className="h-2 bg-white/10 rounded-full w-full mt-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
