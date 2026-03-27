/**
 * /courses catalog loading skeleton with shimmer effect.
 */
export default function CoursesLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      {/* Header */}
      <div className="mb-10">
        <div className="skeleton h-10 w-52 rounded-xl mb-3" />
        <div className="skeleton h-4 w-72 rounded-lg" />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-10 w-24 rounded-xl" />
        ))}
      </div>

      {/* Course grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="backdrop-blur-lg bg-white/[0.06] border border-border rounded-lg overflow-hidden"
          >
            <div className="skeleton h-44 w-full rounded-none" />
            <div className="p-5 space-y-3">
              <div className="flex gap-2">
                <div className="skeleton h-5 w-16 rounded-full" />
                <div className="skeleton h-5 w-20 rounded-full" />
              </div>
              <div className="skeleton h-5 w-4/5 rounded-lg" />
              <div className="skeleton h-3 w-full rounded-lg" />
              <div className="skeleton h-3 w-2/3 rounded-lg" />
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1">
                  <div className="skeleton h-3 w-8 rounded" />
                  <div className="skeleton h-3 w-3 rounded" />
                </div>
                <div className="skeleton h-5 w-14 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
