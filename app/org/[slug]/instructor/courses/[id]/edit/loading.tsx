/** Org instructor → Edit Course skeleton — back link + heading + CourseForm (2-col) + Course Content section. */
import { HeadingSkeleton, Skeleton, RowSkeleton } from "@/components/ui/Skeleton";

function FieldSkeleton({ inputH = "h-10" }: { inputH?: string }) {
  return (
    <div className="space-y-1.5">
      <Skeleton h="h-3" w="w-24" />
      <Skeleton h={inputH} w="w-full" className="rounded-md" />
    </div>
  );
}

function FormCardSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass p-5 space-y-4">
      <Skeleton h="h-5" w="w-32" />
      {children}
    </div>
  );
}

export default function OrgCourseEditLoading() {
  return (
    <div>
      <Skeleton h="h-4" w="w-36" className="mb-6" />
      <HeadingSkeleton className="mb-6" />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: content cards */}
        <div className="xl:col-span-2 space-y-6 min-w-0">
          <FormCardSkeleton>
            <FieldSkeleton />
            <FieldSkeleton />
            <FieldSkeleton inputH="h-40" />
          </FormCardSkeleton>
          <FormCardSkeleton>
            <FieldSkeleton inputH="h-32" />
          </FormCardSkeleton>
          <FormCardSkeleton>
            <Skeleton h="h-10" w="w-full" className="rounded-md" />
          </FormCardSkeleton>
        </div>

        {/* Right: settings sidebar */}
        <div className="xl:col-span-1 space-y-6 min-w-0">
          <div className="glass p-5 space-y-4">
            <Skeleton h="h-5" w="w-28" />
            <FieldSkeleton />
            <div className="h-px bg-border" />
            <FieldSkeleton />
            <FieldSkeleton />
            <FieldSkeleton />
            <div className="h-px bg-border" />
            <Skeleton h="h-10" w="w-full" className="rounded-md" />
          </div>
        </div>
      </div>

      {/* Course Content section */}
      <div className="mt-10">
        <Skeleton h="h-6" w="w-44" className="mb-5" />
        <RowSkeleton rows={4} />
      </div>
    </div>
  );
}
