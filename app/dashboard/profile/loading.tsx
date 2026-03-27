/**
 * Profile loading skeleton — header + account info + profile form + password form.
 */
import { Skeleton } from "@/components/ui/Skeleton";

function FormFieldSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton h="h-4" w="w-20" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );
}

export default function ProfileLoading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8 animate-pulse">
        <Skeleton className="h-9 w-52 rounded-xl mb-2" />
        <Skeleton className="h-4 w-72 rounded-lg" />
      </div>

      <div className="space-y-6">
        {/* Account Info card */}
        <div className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl p-6 animate-pulse">
          <div className="flex items-center gap-4 mb-4">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton h="h-5" w="w-40" />
              <Skeleton h="h-3" w="w-52" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/[0.06]">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="text-center space-y-2">
                <Skeleton className="h-7 w-10 mx-auto rounded-lg" />
                <Skeleton className="h-3 w-20 mx-auto rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Profile Form card */}
        <div className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl p-6 animate-pulse">
          <Skeleton h="h-6" w="w-32" className="mb-6" />
          <div className="space-y-4">
            <FormFieldSkeleton />
            <FormFieldSkeleton />
            <FormFieldSkeleton />
            <FormFieldSkeleton />
            <Skeleton className="h-10 w-28 rounded-lg mt-2" />
          </div>
        </div>

        {/* Password Form card */}
        <div className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl p-6 animate-pulse">
          <Skeleton h="h-6" w="w-40" className="mb-6" />
          <div className="space-y-4">
            <FormFieldSkeleton />
            <FormFieldSkeleton />
            <Skeleton className="h-10 w-36 rounded-lg mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
