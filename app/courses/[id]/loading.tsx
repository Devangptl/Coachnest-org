/**
 * Course detail page loading skeleton — matches redesigned layout.
 */
export default function CourseDetailLoading() {
  return (
    <div className="pb-10">
      {/* ── Hero skeleton ───────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-700/10 to-orange-500/10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-4">
            <div className="skeleton h-3 w-10 rounded" />
            <div className="skeleton h-3 w-3 rounded" />
            <div className="skeleton h-3 w-16 rounded" />
            <div className="skeleton h-3 w-3 rounded" />
            <div className="skeleton h-3 w-20 rounded" />
          </div>

          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Left info */}
            <div className="flex-1 min-w-0">
              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <div className="skeleton h-5 w-20 rounded-md" />
                <div className="skeleton h-5 w-16 rounded-md" />
                <div className="skeleton h-5 w-16 rounded-md" />
              </div>
              
              {/* Title */}
              <div className="skeleton h-10 w-full max-w-lg rounded-xl mb-3" />
              <div className="skeleton h-10 w-2/3 max-w-md rounded-xl mb-3" />

              {/* Description */}
              <div className="space-y-2 mb-4">
                <div className="skeleton h-4 w-full max-w-2xl rounded" />
                <div className="skeleton h-4 w-5/6 max-w-xl rounded" />
                <div className="skeleton h-4 w-4/6 max-w-lg rounded" />
              </div>

              {/* Rating + meta */}
              <div className="flex items-center gap-3 mb-4">
                <div className="skeleton h-6 w-32 rounded-lg" />
                <div className="skeleton h-5 w-24 rounded-lg" />
              </div>

              {/* Instructor */}
              <div className="flex items-center gap-2.5 mt-2">
                <div className="skeleton w-8 h-8 rounded-full" />
                <div className="space-y-1.5">
                  <div className="skeleton h-2 w-16 rounded" />
                  <div className="skeleton h-3 w-24 rounded" />
                </div>
              </div>
            </div>

            {/* Right thumbnail */}
            <div className="lg:w-[360px] flex-shrink-0">
              <div className="skeleton aspect-video w-full rounded-xl" />
              <div className="grid grid-cols-3 gap-2 mt-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="backdrop-blur-md bg-secondary border border-border rounded-lg px-2 py-2 text-center flex flex-col items-center gap-1.5">
                    <div className="skeleton h-3.5 w-3.5 rounded" />
                    <div className="skeleton h-3 w-8 rounded mt-0.5" />
                    <div className="skeleton h-2 w-12 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom separator */}
        <div className="h-px bg-border" />
      </div>

      {/* ── Main content tabs & enroll bar ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-5">
        {/* Enroll bar skeleton */}
        <div className="mb-6 backdrop-blur-xl bg-white/[0.04] border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <div className="skeleton h-8 w-32 rounded-lg" />
             <div className="flex flex-col sm:flex-row gap-2">
                <div className="skeleton h-10 w-full sm:w-32 rounded-lg" />
                <div className="flex gap-2">
                  <div className="skeleton h-[46px] w-[46px] rounded-xl" />
                  <div className="skeleton h-[46px] w-[46px] rounded-xl" />
                </div>
             </div>
          </div>
          <div className="bg-black/10 px-4 py-3 sm:px-5 sm:py-3.5">
             <div className="skeleton h-4 w-32 rounded mb-4" />
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                     <div className="skeleton w-7 h-7 rounded-lg flex-shrink-0" />
                     <div className="skeleton h-3.5 w-24 rounded" />
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Tabs & Content */}
        <div className="w-full space-y-4 sm:space-y-6">
           {/* Tab bar */}
           <div className="flex gap-2 p-1.5 bg-secondary/30 rounded-xl w-max border border-border/50">
             <div className="skeleton h-9 w-24 rounded-lg" />
             <div className="skeleton h-9 w-24 rounded-lg" />
             <div className="skeleton h-9 w-24 rounded-lg" />
           </div>

           <div className="space-y-8">
             {/* About Section */}
             <div className="backdrop-blur-md bg-secondary border border-border rounded-lg p-4 sm:p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                   <div className="skeleton w-5 h-5 rounded-md" />
                   <div className="skeleton h-6 w-48 rounded" />
                </div>
                <div className="skeleton h-4 w-full rounded" />
                <div className="skeleton h-4 w-full rounded" />
                <div className="skeleton h-4 w-3/4 rounded" />
             </div>

             {/* What you'll learn */}
             <div className="backdrop-blur-md bg-secondary border border-border rounded-lg p-4 sm:p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                   <div className="skeleton w-5 h-5 rounded-md" />
                   <div className="skeleton h-6 w-48 rounded" />
                </div>
                <div className="grid sm:grid-cols-2 gap-4 mt-2">
                   {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex gap-2.5 items-center">
                         <div className="skeleton w-4 h-4 rounded flex-shrink-0" />
                         <div className="skeleton h-3.5 w-full rounded" />
                      </div>
                   ))}
                </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
