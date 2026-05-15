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
export function CourseCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="glass overflow-hidden animate-pulse">
      <Skeleton className={`${compact ? "h-[100px]" : "h-44"} w-full rounded-none`} />
      <div className={`${compact ? "p-2 space-y-1.5" : "p-5 space-y-3"}`}>
        <Skeleton h={compact ? "h-3" : "h-5"} w="w-4/5" />
        {!compact && <Skeleton h="h-3" w="w-full" />}
        {!compact && <Skeleton h="h-3" w="w-2/3" />}
        <div className="flex gap-3 pt-1">
          <Skeleton h="h-3" w="w-14" />
          <Skeleton h="h-3" w="w-12" />
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

/** Stat tile skeleton — icon + value + label. */
export function StatCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4 animate-pulse">
      <Skeleton className="w-11 h-11 rounded-md" />
      <div className="space-y-2 flex-1">
        <Skeleton h="h-6" w="w-12" />
        <Skeleton h="h-3" w="w-20" />
      </div>
    </div>
  );
}

/** Heading skeleton — title + optional subtitle. */
export function HeadingSkeleton({ subtitle = true, className }: { subtitle?: boolean; className?: string }) {
  return (
    <div className={cn("animate-pulse space-y-2", className)}>
      <Skeleton className="h-7 w-48 rounded-md" />
      {subtitle && <Skeleton h="h-3" w="w-72" />}
    </div>
  );
}

/** Section header skeleton — small heading. */
export function SectionHeadingSkeleton() {
  return (
    <div className="flex items-center justify-between mb-4 animate-pulse">
      <Skeleton h="h-5" w="w-44" />
      <Skeleton h="h-3" w="w-16" />
    </div>
  );
}

/** Grid of course card skeletons (configurable count). */
export function CourseGridSkeleton({ count = 4, compact = true }: { count?: number; compact?: boolean }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <CourseCardSkeleton key={i} compact={compact} />
      ))}
    </div>
  );
}

/** List item skeleton for forum threads, peer reviews, etc. */
export function ListItemSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card animate-pulse">
          <div className="flex-1 space-y-2">
            <Skeleton h="h-4" w="w-2/3" />
            <Skeleton h="h-3" w="w-1/3" />
          </div>
          <Skeleton h="h-4" w="w-10" className="ml-4" />
        </div>
      ))}
    </div>
  );
}

/** Card grid skeleton (for groups, peer reviews — 2-col layout). */
export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 rounded-lg border border-border bg-card animate-pulse space-y-2">
          <Skeleton h="h-4" w="w-2/3" />
          <Skeleton h="h-3" w="w-full" />
          <Skeleton h="h-3" w="w-1/4" className="mt-2" />
        </div>
      ))}
    </div>
  );
}

/** Activity feed item skeleton — avatar + text rows. */
export function FeedItemSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card animate-pulse">
          <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton h="h-3" w="w-3/4" />
            <Skeleton h="h-2" w="w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
