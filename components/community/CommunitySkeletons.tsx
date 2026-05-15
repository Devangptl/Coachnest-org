/**
 * Community skeletons — shaped to mirror the real layouts so the
 * skeleton→content swap doesn't shift. Used by both the route-level
 * loading.tsx files and the in-page client loading states (single
 * source of truth — keep these in sync with the pages).
 */
import { Skeleton } from "@/components/ui/Skeleton";

const PAGE = "py-6 sm:py-8 space-y-5 sm:space-y-6";

function BackLink() {
  return <Skeleton className="h-5 w-32 rounded-md" />;
}

/* ── Forum thread detail ─────────────────────────────────────────────── */

export function ReplyCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-md border border-border bg-card p-3 sm:p-5 animate-pulse">
          <div className="flex gap-2 sm:gap-3">
            <div className="flex flex-col items-center gap-1 pt-1 flex-shrink-0">
              <Skeleton className="w-5 h-5 rounded" />
              <Skeleton h="h-3" w="w-4" />
              <Skeleton className="w-5 h-5 rounded" />
            </div>
            <div className="flex-1 space-y-2">
              <Skeleton h="h-3" w="w-full" />
              <Skeleton h="h-3" w="w-5/6" />
              <div className="flex items-center gap-2 pt-2">
                <Skeleton className="w-6 h-6 rounded-full" />
                <Skeleton h="h-3" w="w-28" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ThreadDetailSkeleton() {
  return (
    <div className={PAGE}>
      <BackLink />

      {/* Thread card */}
      <div className="rounded-md border border-border bg-card p-4 sm:p-6 animate-pulse space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="h-4 w-20 rounded-full" />
        </div>
        <Skeleton h="h-7" w="w-2/3" />
        <div className="space-y-2">
          <Skeleton h="h-3" w="w-full" />
          <Skeleton h="h-3" w="w-full" />
          <Skeleton h="h-3" w="w-3/4" />
        </div>
        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton h="h-3" w="w-32" />
            <Skeleton h="h-2" w="w-24" />
          </div>
        </div>
      </div>

      {/* Replies */}
      <div className="space-y-3">
        <Skeleton h="h-4" w="w-32" />
        <ReplyCardsSkeleton count={3} />
      </div>

      {/* Reply box */}
      <div className="rounded-md border border-border bg-card p-4 sm:p-5 animate-pulse space-y-3">
        <Skeleton h="h-4" w="w-28" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <div className="flex justify-end">
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/* ── Forum thread list (forums list + re-fetch) ──────────────────────── */

export function ThreadListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-md border border-border bg-card p-4 sm:p-5 animate-pulse">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton h="h-4" w="w-2/3" />
              <Skeleton h="h-3" w="w-full" />
              <Skeleton h="h-3" w="w-1/3" />
            </div>
            <Skeleton className="h-7 w-12 rounded-lg flex-shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Study group detail ──────────────────────────────────────────────── */

export function GroupMembersSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-md border border-border bg-card p-3 sm:p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton h="h-3" w="w-1/3" />
              <Skeleton h="h-2" w="w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function GroupDetailSkeleton() {
  return (
    <div className={PAGE}>
      <BackLink />

      {/* Group header */}
      <div className="rounded-md border border-border bg-card p-4 sm:p-6 animate-pulse space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 space-y-3 min-w-0">
            <div className="flex gap-2">
              <Skeleton className="h-4 w-14 rounded-full" />
              <Skeleton className="h-4 w-20 rounded-full" />
            </div>
            <Skeleton h="h-7" w="w-1/2" />
            <Skeleton h="h-3" w="w-2/3" />
          </div>
          <Skeleton className="h-9 w-full sm:w-28 rounded-lg flex-shrink-0" />
        </div>
        <div className="flex flex-wrap gap-4 pt-4 border-t border-border">
          <Skeleton h="h-3" w="w-28" />
          <Skeleton h="h-3" w="w-32" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary rounded-lg w-fit">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-md" />
        ))}
      </div>

      {/* Members */}
      <GroupMembersSkeleton count={4} />
    </div>
  );
}

export function GroupNotesSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-md border border-border bg-card p-4 sm:p-5 animate-pulse space-y-2">
          <Skeleton h="h-4" w="w-1/3" />
          <Skeleton h="h-3" w="w-full" />
          <Skeleton h="h-3" w="w-5/6" />
          <div className="flex items-center gap-2 pt-3 border-t border-border">
            <Skeleton className="w-6 h-6 rounded-full" />
            <Skeleton h="h-3" w="w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function GroupProgressSkeleton() {
  return (
    <div className="space-y-6">
      {/* XP banner */}
      <div className="rounded-md border border-border bg-card p-4 sm:p-5 flex items-center gap-4 animate-pulse">
        <Skeleton className="w-12 h-12 sm:w-14 sm:h-14 rounded-md flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton h="h-6" w="w-24" />
          <Skeleton h="h-3" w="w-2/3" />
        </div>
      </div>
      {/* Stat grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-md border border-border bg-card p-4 text-center animate-pulse space-y-2">
            <Skeleton className="w-8 h-8 rounded-lg mx-auto" />
            <Skeleton h="h-5" w="w-10" className="mx-auto" />
            <Skeleton h="h-2" w="w-16" className="mx-auto" />
          </div>
        ))}
      </div>
      {/* Leaderboard */}
      <div className="space-y-2">
        <Skeleton h="h-4" w="w-40" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-md border border-border bg-card animate-pulse">
            <Skeleton className="w-7 h-7 rounded-lg flex-shrink-0" />
            <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton h="h-3" w="w-1/3" />
              <Skeleton h="h-2" w="w-1/2" />
            </div>
            <Skeleton h="h-4" w="w-12 flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function GroupRequestsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 rounded-md border border-border bg-card animate-pulse">
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton h="h-3" w="w-1/3" />
              <Skeleton h="h-2" w="w-1/2" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Peer review detail ──────────────────────────────────────────────── */

export function PeerReviewDetailSkeleton() {
  return (
    <div className={PAGE}>
      <BackLink />

      {/* Assignment card */}
      <div className="rounded-md border border-border bg-card p-4 sm:p-6 animate-pulse space-y-3">
        <div className="flex items-start gap-2">
          <Skeleton className="w-5 h-5 rounded flex-shrink-0" />
          <Skeleton h="h-7" w="w-2/3" />
        </div>
        <Skeleton h="h-3" w="w-full" />
        <Skeleton h="h-3" w="w-5/6" />
        <div className="flex flex-wrap gap-4 pt-4 border-t border-border">
          <Skeleton h="h-3" w="w-24" />
          <Skeleton h="h-3" w="w-20" />
          <Skeleton h="h-3" w="w-16" />
        </div>
      </div>

      {/* Reviews */}
      <div className="space-y-3">
        <Skeleton h="h-4" w="w-28" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-md border border-border bg-card p-4 sm:p-5 animate-pulse space-y-2">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, s) => (
                <Skeleton key={s} className="w-4 h-4 rounded-sm" />
              ))}
            </div>
            <Skeleton h="h-3" w="w-full" />
            <Skeleton h="h-3" w="w-4/5" />
            <Skeleton h="h-3" w="w-1/4" className="mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Peer review list (list + re-fetch) ──────────────────────────────── */

export function AssignmentListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-md border border-border bg-card p-4 sm:p-5 animate-pulse">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton h="h-4" w="w-1/2" />
              <Skeleton h="h-3" w="w-full" />
              <Skeleton h="h-3" w="w-1/3" />
            </div>
            <Skeleton className="h-7 w-16 rounded-lg flex-shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
