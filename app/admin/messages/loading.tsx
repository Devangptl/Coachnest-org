/**
 * /admin/messages/loading — Skeleton loader for messages list
 */
export default function AdminMessagesLoading() {
  return (
    <div>
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-md skeleton" />
          <div className="h-8 w-40 rounded-lg skeleton" />
        </div>
        <div className="h-4 w-32 rounded skeleton mt-1.5" />
      </div>

      {/* Tabs + Search skeleton */}
      <div className="flex gap-4 mb-6">
        <div className="flex gap-1 bg-card border border-border rounded-lg p-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-16 rounded-md skeleton" />
          ))}
        </div>
        <div className="h-10 flex-1 max-w-md rounded-lg skeleton" />
      </div>

      {/* Table skeleton */}
      <div className="glass overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-border">
          <div className="col-span-3 h-3 w-16 rounded skeleton" />
          <div className="col-span-3 h-3 w-16 rounded skeleton" />
          <div className="col-span-2 h-3 w-12 rounded skeleton" />
          <div className="col-span-2 h-3 w-16 rounded skeleton" />
          <div className="col-span-2 h-3 w-12 rounded skeleton ml-auto" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="grid grid-cols-12 gap-4 items-center px-5 py-4 border-b border-border/30">
            <div className="col-span-3 space-y-1.5">
              <div className="h-4 w-28 rounded skeleton" />
              <div className="h-3 w-36 rounded skeleton" />
            </div>
            <div className="col-span-3 space-y-1.5">
              <div className="h-4 w-32 rounded skeleton" />
              <div className="h-3 w-40 rounded skeleton" />
            </div>
            <div className="col-span-2">
              <div className="h-5 w-16 rounded skeleton" />
            </div>
            <div className="col-span-2">
              <div className="h-4 w-14 rounded skeleton" />
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <div className="h-7 w-14 rounded skeleton" />
              <div className="h-7 w-8 rounded skeleton" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
