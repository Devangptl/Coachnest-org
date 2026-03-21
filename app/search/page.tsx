/**
 * /search — Course search with filters.
 * Server component that delegates interactivity to SearchPageClient.
 */
import { Suspense } from "react";
import SearchPageClient from "./SearchPageClient";

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 animate-pulse space-y-6 pb-16">
        <div className="h-10 w-64 bg-white/10 rounded-xl" />
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="h-96 bg-white/5 rounded-2xl" />
          <div className="lg:col-span-3 grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 bg-white/5 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    }>
      <SearchPageClient />
    </Suspense>
  );
}
