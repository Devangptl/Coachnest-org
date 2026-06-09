import { Skeleton } from "@/components/ui/Skeleton";

export default function CoursesLoading() {
  return (
    <div className="pt-6 pb-16">
      {/* Header */}
      <div className="mb-6">
        <Skeleton className="h-8 w-44 rounded-md mb-2" />
        <Skeleton className="h-4 w-36 rounded" />
      </div>

      {/* Curated Course Lists section */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-6 w-48 rounded-md" />
          <Skeleton className="h-4 w-14 rounded" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-card border border-border/60 rounded-md overflow-hidden animate-pulse"
            >
              <Skeleton className="h-[100px] w-full rounded-none" />
              <div className="p-2 space-y-1.5">
                <Skeleton className="h-3 w-4/5 rounded" />
                <Skeleton className="h-2.5 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* All Courses section */}
      <section>
        {/* Section heading */}
        <div className="mb-3">
          <Skeleton className="h-6 w-32 rounded-md" />
        </div>

        {/* Count line (mirrors CoursesBrowser's "N courses" line) */}
        <div className="mb-5">
          <Skeleton className="h-4 w-20 rounded" />
        </div>

        {/* Course grid — matches CoursesBrowser compact grid exactly */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="bg-card border border-border/60 rounded-md overflow-hidden animate-pulse"
            >
              {/* Thumbnail — compact height matches CourseCard compact mode */}
              <Skeleton className="h-[100px] w-full rounded-none" />
              {/* Content — compact padding, no description or badges */}
              <div className="p-2 space-y-1.5">
                <Skeleton className="h-3 w-4/5 rounded" />
                <div className="flex gap-3 pt-1">
                  <Skeleton className="h-2.5 w-10 rounded" />
                  <Skeleton className="h-2.5 w-8 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
