/**
 * Course detail page loading skeleton — mirrors the live layout:
 * full-bleed hero on top, then a two-column grid with main content
 * on the left and a sticky enroll/info card on the right.
 */
import { Skeleton } from "@/components/ui/Skeleton";

export default function CourseDetailLoading() {
  return (
    <div className="pb-10">
      {/* ── Hero (full-bleed) ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden -mx-3 sm:-mx-5 lg:-mx-7">
        <div className="relative px-3 sm:px-5 lg:px-7 pt-7 pb-10 animate-pulse">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 mb-5">
            <Skeleton h="h-3" w="w-8" />
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton h="h-3" w="w-14" />
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton h="h-3" w="w-20" />
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>

          {/* Title */}
          <Skeleton className="h-9 sm:h-10 lg:h-12 w-full max-w-2xl rounded-md mb-3" />
          <Skeleton className="h-9 sm:h-10 lg:h-12 w-3/4 max-w-xl rounded-md mb-5" />

          {/* Description */}
          <div className="space-y-2 mb-7">
            <Skeleton h="h-4" w="w-full" className="max-w-3xl" />
            <Skeleton h="h-4" w="w-11/12" className="max-w-2xl" />
            <Skeleton h="h-4" w="w-4/6" className="max-w-xl" />
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 mb-7">
            <div className="flex items-center gap-2">
              <Skeleton h="h-5" w="w-8" />
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="w-4 h-4 rounded" />
                ))}
              </div>
              <Skeleton h="h-3" w="w-12" />
            </div>
            <div className="hidden sm:block w-px h-4 bg-border flex-shrink-0" />
            <div className="flex items-center gap-2">
              <Skeleton className="w-3.5 h-3.5 rounded" />
              <Skeleton h="h-3.5" w="w-24" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="w-3.5 h-3.5 rounded" />
              <Skeleton h="h-3.5" w="w-20" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="w-3.5 h-3.5 rounded" />
              <Skeleton h="h-3.5" w="w-20" />
            </div>
          </div>

          {/* Instructor strip */}
          <div className="flex items-center gap-4 flex-wrap pt-5 border-t border-border">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
              <div className="space-y-1.5">
                <Skeleton h="h-2.5" w="w-16" />
                <Skeleton h="h-3.5" w="w-32" />
              </div>
            </div>
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* ── Two-column body ───────────────────────────────────────────────── */}
      <div className="mt-6">
        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_380px] lg:items-start lg:gap-8">

          {/* ── Right sidebar (enroll/info card) ── */}
          <div className="lg:col-start-2 lg:row-start-1 lg:sticky lg:top-20 mb-6 lg:mb-0 animate-pulse">
            <div className="border border-border rounded-md overflow-hidden">
              {/* Thumbnail */}
              <Skeleton className="aspect-video w-full rounded-none" />

              {/* Progress / CTA block */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton h="h-3" w="w-20" />
                </div>
                <Skeleton h="h-3" w="w-3/4" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-2 flex-1 rounded-full" />
                  <Skeleton h="h-3" w="w-9" />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Skeleton className="h-10 flex-1 rounded-md" />
                  <Skeleton className="h-9 w-9 rounded-md" />
                  <Skeleton className="h-9 w-9 rounded-md" />
                </div>
              </div>

              {/* Course includes */}
              <div className="border-t border-border px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                  <Skeleton h="h-3.5" w="w-32" />
                  <Skeleton h="h-3" w="w-10" />
                </div>
                <div className="grid grid-cols-2 gap-y-2.5 gap-x-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Skeleton className="w-5 h-5 rounded-md flex-shrink-0" />
                      <Skeleton h="h-3" w="w-full" className="max-w-[110px]" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Left main content (overview tab) ── */}
          <div className="lg:col-start-1 lg:row-start-1 min-w-0">
            <div className="space-y-8 animate-pulse">

              {/* About this course */}
              <div className="bg-secondary border border-border rounded-md p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Skeleton className="w-5 h-5 rounded-md" />
                  <Skeleton h="h-5" w="w-48" />
                </div>
                <div className="space-y-2">
                  <Skeleton h="h-4" w="w-full" />
                  <Skeleton h="h-4" w="w-11/12" />
                  <Skeleton h="h-4" w="w-10/12" />
                  <Skeleton h="h-4" w="w-3/4" />
                </div>
              </div>

              {/* What you'll learn */}
              <div className="bg-secondary border border-border rounded-md p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Skeleton className="w-5 h-5 rounded-md" />
                  <Skeleton h="h-5" w="w-44" />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <Skeleton className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5" />
                      <Skeleton h="h-3.5" w="w-full" className="max-w-[220px]" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Course content (curriculum preview) */}
              <div className="bg-secondary border border-border rounded-md p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-1">
                  <Skeleton className="w-5 h-5 rounded-md" />
                  <Skeleton h="h-5" w="w-40" />
                </div>
                <Skeleton h="h-3" w="w-32" className="mb-4" />
                <div className="space-y-1.5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-md border border-border/60 overflow-hidden">
                      {/* Chapter header */}
                      <div className="flex items-center gap-3 px-3 py-2.5 bg-secondary/40">
                        <Skeleton className="w-5 h-5 rounded flex-shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton h="h-3.5" w="w-1/2" className="max-w-[180px]" />
                          <Skeleton h="h-2.5" w="w-1/3" className="max-w-[100px]" />
                        </div>
                        <Skeleton className="w-3.5 h-3.5 rounded flex-shrink-0" />
                      </div>
                      {/* Lesson rows */}
                      <div className="px-2 py-1 space-y-0.5 border-t border-border/40 bg-background/20">
                        {Array.from({ length: 3 }).map((_, j) => (
                          <div key={j} className="flex items-center gap-3 px-3 py-2.5">
                            <Skeleton h="h-3" w="w-4" />
                            <Skeleton className="w-4 h-4 rounded-full flex-shrink-0" />
                            <Skeleton className="w-4 h-4 rounded flex-shrink-0" />
                            <Skeleton h="h-3.5" w="w-full" className="max-w-[260px] flex-1" />
                            <Skeleton h="h-3" w="w-10" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
