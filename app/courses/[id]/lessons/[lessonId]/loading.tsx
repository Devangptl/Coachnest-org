/**
 * Skeleton shown while lesson content is loading.
 * Matches the shape of LessonContentClient to prevent layout shift.
 */
export default function LessonLoading() {
  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-8 py-6 sm:py-10 animate-pulse">
      {/* Lesson header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-secondary flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-secondary rounded w-32" />
            <div className="h-6 bg-secondary rounded w-2/3" />
          </div>
        </div>
        <div className="h-px bg-border mt-4" />
        <div className="flex justify-end mt-4">
          <div className="h-9 w-36 bg-secondary rounded-md" />
        </div>
      </div>

      {/* Content card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 sm:px-10 py-8 space-y-4">
          <div className="h-4 bg-secondary rounded w-full" />
          <div className="h-4 bg-secondary rounded w-5/6" />
          <div className="h-4 bg-secondary rounded w-4/5" />
          <div className="h-4 bg-secondary rounded w-full" />
          <div className="h-4 bg-secondary rounded w-3/4" />
          <div className="h-24 bg-secondary/60 rounded-xl mt-6" />
          <div className="h-4 bg-secondary rounded w-full" />
          <div className="h-4 bg-secondary rounded w-5/6" />
          <div className="h-4 bg-secondary rounded w-2/3" />
        </div>
      </div>

      {/* Prev / Next */}
      <div className="flex justify-between mt-8 pt-6 border-t border-border gap-3">
        <div className="h-16 w-48 bg-secondary rounded-xl" />
        <div className="h-16 w-48 bg-secondary rounded-xl" />
      </div>
    </div>
  );
}
