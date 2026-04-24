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
      {/* Search bar */}
      <div className="mb-3 h-11 bg-secondary rounded-md w-full" />
      {/* Filter + sort row */}
      <div className="flex gap-2 mb-6">
        <div className="h-10 w-24 bg-secondary rounded-lg" />
        <div className="h-10 flex-1 lg:flex-none lg:w-36 bg-secondary rounded-lg" />
      </div>
      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-72 bg-secondary rounded-lg" />
        ))}
      </div>
    </div>
  );
}
