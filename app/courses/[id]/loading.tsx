/**
 * Course detail page loading skeleton — matches redesigned layout.
 */
export default function CourseDetailLoading() {
  return (
    <div className="pb-20">
      {/* Hero skeleton */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-8">
          <div className="skeleton h-4 w-12 rounded" />
          <div className="skeleton h-4 w-4 rounded" />
          <div className="skeleton h-4 w-16 rounded" />
          <div className="skeleton h-4 w-4 rounded" />
          <div className="skeleton h-4 w-24 rounded" />
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-14">
          {/* Left info */}
          <div className="flex-1 min-w-0 space-y-5">
            <div className="flex gap-2">
              <div className="skeleton h-6 w-20 rounded-full" />
              <div className="skeleton h-6 w-24 rounded-full" />
              <div className="skeleton h-6 w-14 rounded-full" />
              <div className="skeleton h-6 w-16 rounded-full" />
            </div>
            <div className="skeleton h-14 w-full max-w-lg rounded-xl" />
            <div className="space-y-2">
              <div className="skeleton h-5 w-full max-w-xl rounded-lg" />
              <div className="skeleton h-5 w-3/4 rounded-lg" />
            </div>
            {/* Rating card */}
            <div className="flex items-center gap-5">
              <div className="skeleton h-12 w-44 rounded-xl" />
              <div className="skeleton h-5 w-32 rounded" />
            </div>
            {/* Instructor card */}
            <div className="skeleton h-16 w-56 rounded-lg" />
          </div>

          {/* Right thumbnail */}
          <div className="lg:w-[440px] flex-shrink-0">
            <div className="skeleton aspect-video w-full rounded-lg" />
            <div className="grid grid-cols-3 gap-3 mt-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="backdrop-blur-md bg-white/[0.04] border border-border rounded-xl px-3 py-3 text-center space-y-1.5">
                  <div className="skeleton h-4 w-4 rounded mx-auto" />
                  <div className="skeleton h-4 w-8 rounded mx-auto" />
                  <div className="skeleton h-2 w-12 rounded mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      {/* Content + sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left: tabs + content */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Tab bar */}
            <div className="backdrop-blur-md bg-white/[0.04] border border-border rounded-lg p-1.5 flex gap-1">
              {["Overview", "Curriculum", "Reviews"].map((t) => (
                <div key={t} className="skeleton h-10 flex-1 sm:flex-none sm:w-28 rounded-xl" />
              ))}
            </div>

            {/* About section with accent */}
            <div className="backdrop-blur-md bg-white/[0.04] border border-border rounded-lg overflow-hidden">
              <div className="flex">
                <div className="w-1 bg-gradient-to-b from-orange-600/50 to-transparent flex-shrink-0" />
                <div className="p-6 sm:p-8 space-y-4 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="skeleton w-10 h-10 rounded-xl" />
                    <div className="skeleton h-6 w-40 rounded-lg" />
                  </div>
                  <div className="skeleton h-4 w-full rounded-lg" />
                  <div className="skeleton h-4 w-full rounded-lg" />
                  <div className="skeleton h-4 w-3/4 rounded-lg" />
                </div>
              </div>
            </div>

            {/* What you'll learn */}
            <div className="backdrop-blur-md bg-white/[0.04] border border-border rounded-lg p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="skeleton w-10 h-10 rounded-xl" />
                <div className="skeleton h-6 w-44 rounded-lg" />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/[0.03] rounded-xl px-4 py-3.5">
                    <div className="skeleton w-6 h-6 rounded-md flex-shrink-0" />
                    <div className="skeleton h-4 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            </div>

            {/* Curriculum preview */}
            <div className="backdrop-blur-md bg-white/[0.04] border border-border rounded-lg p-6 sm:p-8 space-y-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="skeleton w-10 h-10 rounded-xl" />
                <div className="skeleton h-6 w-40 rounded-lg" />
              </div>
              <div className="skeleton h-4 w-48 rounded ml-[52px] mb-4" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 pl-2 py-3 ml-3">
                  <div className="skeleton w-8 h-8 rounded-full" />
                  <div className="skeleton w-10 h-10 rounded-xl" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-4 w-3/4 rounded-lg" />
                    <div className="skeleton h-3 w-24 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: sidebar */}
          <aside className="lg:w-[360px] flex-shrink-0">
            <div className="backdrop-blur-xl bg-white/[0.06] border border-border rounded-lg overflow-hidden">
              <div className="p-6 border-b border-border space-y-4">
                <div className="skeleton h-9 w-24 rounded-lg" />
                <div className="skeleton h-12 w-full rounded-xl" />
                <div className="flex items-center justify-center gap-2">
                  <div className="skeleton w-8 h-8 rounded-full" />
                  <div className="skeleton h-3 w-24 rounded" />
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="skeleton h-4 w-36 rounded" />
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="skeleton w-7 h-7 rounded-lg flex-shrink-0" />
                    <div className="skeleton h-3.5 w-full rounded" />
                  </div>
                ))}
              </div>
              <div className="px-6 pb-6">
                <div className="skeleton h-10 w-full rounded-xl" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
