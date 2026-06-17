/**
 * Admin profile loading skeleton — header + account overview card (info rows + 3 stat tiles)
 * + edit profile form card + change password form card.
 */
import { Skeleton } from "@/components/ui/Skeleton";

export default function AdminProfileLoading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8 animate-pulse space-y-2">
        <Skeleton className="h-8 w-56 rounded-md" />
        <Skeleton h="h-3" w="w-72" />
      </div>

      <div className="space-y-6">
        {/* Account Overview */}
        <div className="bg-card border border-border rounded-lg p-4 sm:p-5 animate-pulse">
          <Skeleton h="h-5" w="w-40" className="mb-4" />
          <div className="grid sm:grid-cols-2 gap-4 mb-5">
            <Skeleton h="h-4" w="w-48" />
            <Skeleton h="h-4" w="w-40" />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-secondary border border-border rounded-md p-3 text-center space-y-1">
                <Skeleton className="h-4 w-4 rounded mx-auto" />
                <Skeleton h="h-5" w="w-10" className="mx-auto" />
                <Skeleton h="h-3" w="w-14" className="mx-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Edit Profile form */}
        <div className="bg-card border border-border rounded-lg p-4 sm:p-5 animate-pulse">
          <Skeleton h="h-5" w="w-28" className="mb-5" />
          <div className="space-y-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="grid sm:grid-cols-2 gap-4">
              <Skeleton h="h-10" className="rounded-md" />
              <Skeleton h="h-10" className="rounded-md" />
            </div>
            <Skeleton h="h-20" className="rounded-md" />
            <Skeleton h="h-10" className="rounded-md" />
            <Skeleton h="h-10" w="w-32" className="rounded-md" />
          </div>
        </div>

        {/* Change Password form */}
        <div className="bg-card border border-border rounded-lg p-4 sm:p-5 animate-pulse">
          <Skeleton h="h-5" w="w-44" className="mb-5" />
          <div className="space-y-4">
            <Skeleton h="h-10" className="rounded-md" />
            <div className="grid sm:grid-cols-2 gap-4">
              <Skeleton h="h-10" className="rounded-md" />
              <Skeleton h="h-10" className="rounded-md" />
            </div>
            <Skeleton h="h-10" w="w-32" className="rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
