/**
 * /search — Course search with filters.
 * Server component that delegates interactivity to SearchPageClient.
 */
import { Suspense } from "react";
import SearchPageClient from "./SearchPageClient";

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="max-w-8xl mx-auto px-4 animate-pulse space-y-6 pb-16">
        <div className="h-10 w-64 bg-secondary rounded-xl" />
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="h-96 bg-secondary rounded-lg" />
          <div className="lg:col-span-3 grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 bg-secondary rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    }>
      <SearchPageClient />
    </Suspense>
  );
}
