import { Suspense } from "react";
import SearchPageClient from "./SearchPageClient";
import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://coachnest.com";

export const metadata: Metadata = {
  title: "Search Courses",
  description: "Search thousands of courses on CoachNest. Find tutorials on web development, design, AI, data science, and more.",
  alternates: { canonical: `${BASE_URL}/search` },
  robots: { index: false, follow: true },
};

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageSkeleton />}>
      <SearchPageClient />
    </Suspense>
  );
}

function SearchPageSkeleton() {
  return (
    <div className="pt-6 pb-16 animate-pulse">
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
