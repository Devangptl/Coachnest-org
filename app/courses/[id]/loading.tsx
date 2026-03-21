/**
 * Course detail page loading skeleton — matches hero + tabs + sidebar layout.
 */
import { Shimmer } from "../../loading";

export default function CourseDetailLoading() {
  return (
    <div className="pb-20">
      {/* Hero skeleton */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Shimmer className="h-4 w-12 rounded" />
          <Shimmer className="h-4 w-4 rounded" />
          <Shimmer className="h-4 w-16 rounded" />
          <Shimmer className="h-4 w-4 rounded" />
          <Shimmer className="h-4 w-24 rounded" />
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Left info */}
          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex gap-2">
              <Shimmer className="h-6 w-20 rounded-full" />
              <Shimmer className="h-6 w-24 rounded-full" />
              <Shimmer className="h-6 w-14 rounded-full" />
            </div>
            <Shimmer className="h-12 w-full max-w-lg rounded-xl" />
            <Shimmer className="h-10 w-full max-w-md rounded-xl" />
            <Shimmer className="h-5 w-full max-w-xl rounded-lg" />
            <Shimmer className="h-5 w-3/4 rounded-lg" />
            <div className="flex items-center gap-4 pt-2">
              <Shimmer className="h-5 w-10 rounded" />
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Shimmer key={i} className="h-4 w-4 rounded" />
                ))}
              </div>
              <Shimmer className="h-4 w-24 rounded" />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Shimmer className="w-10 h-10 rounded-full" />
              <div className="space-y-1.5">
                <Shimmer className="h-3 w-16 rounded" />
                <Shimmer className="h-4 w-28 rounded" />
              </div>
            </div>
          </div>

          {/* Right thumbnail */}
          <div className="lg:w-[420px] flex-shrink-0">
            <Shimmer className="aspect-video w-full rounded-2xl" />
            <div className="grid grid-cols-3 gap-3 mt-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="backdrop-blur-md bg-white/[0.04] border border-white/10 rounded-xl px-3 py-3 text-center space-y-1.5">
                  <Shimmer className="h-4 w-4 rounded mx-auto" />
                  <Shimmer className="h-4 w-8 rounded mx-auto" />
                  <Shimmer className="h-2 w-12 rounded mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Content + sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left: tabs + content */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Tab bar */}
            <div className="backdrop-blur-md bg-white/[0.04] border border-white/10 rounded-2xl p-1.5 flex gap-1">
              {["Overview", "Curriculum", "Reviews"].map((t) => (
                <Shimmer key={t} className="h-10 w-28 rounded-xl" />
              ))}
            </div>

            {/* About section */}
            <div className="backdrop-blur-md bg-white/[0.04] border border-white/10 rounded-2xl p-6 space-y-4">
              <Shimmer className="h-6 w-48 rounded-lg" />
              <Shimmer className="h-4 w-full rounded-lg" />
              <Shimmer className="h-4 w-full rounded-lg" />
              <Shimmer className="h-4 w-3/4 rounded-lg" />
            </div>

            {/* What you'll learn */}
            <div className="backdrop-blur-md bg-white/[0.04] border border-white/10 rounded-2xl p-6 space-y-4">
              <Shimmer className="h-6 w-44 rounded-lg" />
              <div className="grid sm:grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Shimmer className="w-4 h-4 rounded flex-shrink-0" />
                    <Shimmer className="h-4 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            </div>

            {/* Curriculum preview */}
            <div className="backdrop-blur-md bg-white/[0.04] border border-white/10 rounded-2xl p-6 space-y-3">
              <Shimmer className="h-6 w-40 rounded-lg" />
              <Shimmer className="h-4 w-48 rounded" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                  <Shimmer className="w-5 h-5 rounded" />
                  <Shimmer className="w-4 h-4 rounded" />
                  <Shimmer className="w-4 h-4 rounded" />
                  <Shimmer className="h-4 flex-1 rounded-lg" />
                  <Shimmer className="h-3 w-10 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Right: sidebar */}
          <aside className="lg:w-[360px] flex-shrink-0">
            <div className="backdrop-blur-xl bg-white/[0.06] border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-white/10 space-y-4">
                <Shimmer className="h-9 w-24 rounded-lg" />
                <Shimmer className="h-12 w-full rounded-xl" />
                <div className="flex items-center justify-center gap-2">
                  <Shimmer className="w-8 h-8 rounded-full" />
                  <Shimmer className="h-3 w-24 rounded" />
                </div>
              </div>
              <div className="p-6 space-y-4">
                <Shimmer className="h-4 w-36 rounded" />
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Shimmer className="w-4 h-4 rounded flex-shrink-0" />
                    <Shimmer className="h-3.5 w-full rounded" />
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
