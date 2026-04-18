/**
 * Skeleton shown while lesson content is loading.
 * Matches the shape of LessonContentClient to prevent layout shift.
 */
import { Skeleton } from "@/components/ui/Skeleton";

export default function LessonLoading() {
  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-8 py-6 sm:py-10 animate-pulse">
      {/* Lesson header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton h="h-3" w="w-32" />
            <Skeleton h="h-6" w="w-2/3" />
          </div>
        </div>
        <div className="h-px bg-border mt-4" />
        <div className="flex justify-end mt-4">
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      </div>

      {/* Content card */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-6 sm:px-10 py-8 space-y-4">
          <Skeleton h="h-4" w="w-full" />
          <Skeleton h="h-4" w="w-5/6" />
          <Skeleton h="h-4" w="w-4/5" />
          <Skeleton h="h-4" w="w-full" />
          <Skeleton h="h-4" w="w-3/4" />
          <Skeleton className="h-24 w-full rounded-xl mt-6" />
          <Skeleton h="h-4" w="w-full" />
          <Skeleton h="h-4" w="w-5/6" />
          <Skeleton h="h-4" w="w-2/3" />
        </div>
      </div>

      {/* Prev / Next */}
      <div className="flex justify-between mt-8 pt-6 border-t border-border gap-3">
        <Skeleton className="h-16 w-48 rounded-xl" />
        <Skeleton className="h-16 w-48 rounded-xl" />
      </div>
    </div>
  );
}
