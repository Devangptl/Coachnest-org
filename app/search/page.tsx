import { Suspense } from "react";
import SearchPageClient from "./SearchPageClient";

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageSkeleton />}>
      <SearchPageClient />
    </Suspense>
  );
}

function SearchPageSkeleton() {
  return (
    <div className="pb-16 animate-pulse">
      {/* Top bar skeleton */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex-1 h-11 bg-secondary rounded-md" />
        <div className="h-11 w-24 bg-secondary rounded-md" />
        <div className="h-11 w-36 bg-secondary rounded-md" />
      </div>
      {/* Grid skeleton */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-72 bg-secondary rounded-lg" />
        ))}
      </div>
    </div>
  );
}
