/**
 * Course detail page loading skeleton — matches redesigned layout.
 */
import { Skeleton } from "@/components/ui/Skeleton";

export default function CourseDetailLoading() {
  return (
    <div className="pb-10">
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="relative pt-5 pb-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-4 animate-pulse">
            <Skeleton h="h-3" w="w-10" />
            <Skeleton h="h-3" w="w-3" />
            <Skeleton h="h-3" w="w-16" />
            <Skeleton h="h-3" w="w-3" />
            <Skeleton h="h-3" w="w-20" />
          </div>

          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Left info */}
            <div className="flex-1 min-w-0 animate-pulse">
              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-5 w-16 rounded-md" />
                <Skeleton className="h-5 w-16 rounded-md" />
              </div>

              {/* Title */}
              <Skeleton className="h-10 w-full max-w-lg rounded-md mb-2" />
              <Skeleton className="h-10 w-2/3 max-w-md rounded-md mb-4" />

              {/* Description */}
              <div className="space-y-2 mb-4">
                <Skeleton h="h-4" w="w-full" className="max-w-2xl" />
                <Skeleton h="h-4" w="w-5/6" className="max-w-xl" />
                <Skeleton h="h-4" w="w-4/6" className="max-w-lg" />
              </div>

              {/* Rating + meta */}
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="h-6 w-32 rounded-lg" />
                <Skeleton className="h-5 w-24 rounded-lg" />
              </div>

              {/* Instructor */}
              <div className="flex items-center gap-2.5 mt-2">
                <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton h="h-2" w="w-16" />
                  <Skeleton h="h-3" w="w-24" />
                </div>
              </div>
            </div>

            {/* Right thumbnail */}
            <div className="lg:w-[360px] flex-shrink-0 animate-pulse">
              <Skeleton className="aspect-video w-full rounded-md" />
              <div className="grid grid-cols-3 gap-2 mt-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-secondary border border-border rounded-lg px-2 py-2 flex flex-col items-center gap-1.5"
                  >
                    <Skeleton className="h-3.5 w-3.5 rounded" />
                    <Skeleton h="h-3" w="w-8" className="mt-0.5" />
                    <Skeleton h="h-2" w="w-12" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="h-px bg-border" />
      </div>

      {/* ── Enroll bar + tabs ──────────────────────────────────────────────── */}
      <div className="mt-5">
        {/*
          Enroll bar skeleton — neutral shape that fits both the enrolled
          (Continue Learning + progress) and non-enrolled (price + Enroll)
          layouts so the swap-in doesn't jarringly resize the page.
        */}
        <div className="mb-6 bg-card border border-border rounded-md overflow-hidden animate-pulse">
          <div className="px-4 py-4 sm:px-5 sm:py-5 border-b border-border flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
            {/* Status / title / progress area */}
            <div className="flex-1 min-w-0 space-y-2.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-20 rounded-full" />
                <Skeleton h="h-3" w="w-24" />
              </div>
              <Skeleton className="h-5 w-2/3 max-w-[260px] rounded-md" />
              <Skeleton h="h-3" w="w-1/2" className="max-w-[200px]" />
              <div className="flex items-center gap-3 pt-1">
                <Skeleton className="h-2 flex-1 rounded-full" />
                <Skeleton h="h-4" w="w-10" />
              </div>
            </div>

            {/* CTA + action icons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 lg:flex-shrink-0">
              <Skeleton className="h-[46px] w-full sm:w-40 rounded-md" />
              <div className="flex gap-2">
                <Skeleton className="h-[46px] w-[46px] rounded-md" />
                <Skeleton className="h-[46px] w-[46px] rounded-md" />
              </div>
            </div>
          </div>

          {/* Resources / Course-includes grid */}
          <div className="px-4 py-3 sm:px-5 sm:py-3.5">
            <Skeleton h="h-4" w="w-32" className="mb-4" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-7 h-7 rounded-lg flex-shrink-0" />
                  <Skeleton h="h-3.5" w="w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 p-1.5 bg-secondary/30 rounded-md w-max border border-border/50 animate-pulse mb-6">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>

        <div className="space-y-6 animate-pulse">
          {/* About */}
          <div className="bg-secondary border border-border rounded-lg p-4 sm:p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="w-5 h-5 rounded-md" />
              <Skeleton h="h-6" w="w-48" />
            </div>
            <Skeleton h="h-4" w="w-full" />
            <Skeleton h="h-4" w="w-full" />
            <Skeleton h="h-4" w="w-3/4" />
          </div>

          {/* What you'll learn */}
          <div className="bg-secondary border border-border rounded-lg p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="w-5 h-5 rounded-md" />
              <Skeleton h="h-6" w="w-48" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mt-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-2.5 items-center">
                  <Skeleton className="w-4 h-4 rounded flex-shrink-0" />
                  <Skeleton h="h-3.5" w="w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
