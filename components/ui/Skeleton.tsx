import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Height shorthand (e.g. "h-4") — added to className */
  h?: string;
  /** Width shorthand (e.g. "w-32") — added to className */
  w?: string;
}

export function Skeleton({ className, h, w, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "skeleton rounded-lg",
        h,
        w,
        className
      )}
      {...props}
    />
  );
}

/** Full card-shaped skeleton for course grid. */
export function CourseCardSkeleton() {
  return (
    <div className="glass overflow-hidden animate-pulse">
      <Skeleton className="h-44 w-full rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton h="h-5" w="w-4/5" />
        <Skeleton h="h-3" w="w-full" />
        <Skeleton h="h-3" w="w-2/3" />
        <div className="flex gap-3 pt-2">
          <Skeleton h="h-3" w="w-20" />
          <Skeleton h="h-3" w="w-16" />
        </div>
      </div>
    </div>
  );
}

/** Row-shaped skeleton for lists/tables. */
export function RowSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 glass animate-pulse">
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton h="h-4" w="w-1/3" />
            <Skeleton h="h-3" w="w-1/2" />
          </div>
          <Skeleton h="h-8" w="w-20" />
        </div>
      ))}
    </div>
  );
}
