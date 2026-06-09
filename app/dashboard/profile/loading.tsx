import { Skeleton } from "@/components/ui/Skeleton";

function FieldSkeleton() {
  return (
    <div className="space-y-1.5">
      <Skeleton h="h-3.5" w="w-20" />
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  );
}

export default function ProfileLoading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-5 sm:mb-8 animate-pulse">
        <Skeleton className="h-7 sm:h-9 w-44 rounded-md mb-2" />
        <Skeleton className="h-4 w-60 rounded-lg" />
      </div>

      {/* Same 2-col layout as the actual page */}
      <div className="flex flex-col lg:flex-row-reverse lg:items-start gap-4 sm:gap-5 lg:gap-6">
        {/* Sidebar — AccountInfo */}
        <div className="lg:w-72 lg:shrink-0">
          <div className="bg-card border border-border rounded-lg p-4 sm:p-5 animate-pulse">
            {/* Profile identity header */}
            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-border">
              <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
              <div className="min-w-0 space-y-1.5 flex-1">
                <Skeleton h="h-4" w="w-28" />
                <Skeleton h="h-3" w="w-36" />
              </div>
            </div>
            {/* Join date */}
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="w-3.5 h-3.5 rounded flex-shrink-0" />
              <Skeleton h="h-3" w="w-28" />
            </div>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-secondary rounded-md p-2.5 text-center space-y-1.5">
                  <Skeleton className="w-3.5 h-3.5 rounded mx-auto" />
                  <Skeleton className="h-4 w-7 rounded mx-auto" />
                  <Skeleton className="h-2.5 w-9 rounded mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main forms */}
        <div className="flex-1 min-w-0 space-y-5 sm:space-y-6">
          {/* ProfileForm */}
          <div className="bg-card border border-border rounded-lg p-5 animate-pulse space-y-4">
            <Skeleton h="h-5" w="w-28" />
            {/* Avatar */}
            <div className="flex items-center gap-3">
              <Skeleton className="w-20 h-20 rounded-full flex-shrink-0" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-20 rounded-md" />
                <Skeleton className="h-7 w-16 rounded-md" />
              </div>
            </div>
            {/* Name + Headline */}
            <div className="grid sm:grid-cols-2 gap-4">
              <FieldSkeleton />
              <FieldSkeleton />
            </div>
            <FieldSkeleton />
            <FieldSkeleton />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>

          {/* ProfessionForm */}
          <div className="bg-card border border-border rounded-lg p-5 animate-pulse space-y-4">
            <Skeleton h="h-5" w="w-32" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-lg" />
              ))}
            </div>
            <div className="flex justify-between items-center pt-2">
              <Skeleton h="h-3" w="w-24" />
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>
          </div>

          {/* PasswordForm */}
          <div className="bg-card border border-border rounded-lg p-5 animate-pulse space-y-4">
            <Skeleton h="h-5" w="w-36" />
            <FieldSkeleton />
            <div className="grid sm:grid-cols-2 gap-4">
              <FieldSkeleton />
              <FieldSkeleton />
            </div>
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
