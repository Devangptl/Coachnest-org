import { Suspense } from "react";
import type { Metadata } from "next";
import ClassesBrowseGrid from "./ClassesBrowseGrid";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://coachnest.com";

export const metadata: Metadata = {
  title: "Browse Classes",
  description: "Cohort-based learning — join a batch and learn together.",
  alternates: { canonical: `${BASE_URL}/classes` },
};

export default function BrowseClassesPage() {
  return (
    <Suspense fallback={<ClassesPageSkeleton />}>
      <ClassesBrowseGrid />
    </Suspense>
  );
}

function ClassesPageSkeleton() {
  return (
    <div className="pt-4 pb-32 animate-pulse">
      <div className="mb-6">
        <div className="h-6 w-44 bg-secondary rounded-md mb-2" />
        <div className="h-3 w-32 bg-secondary/70 rounded-md" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-64 bg-secondary rounded-lg" />
        ))}
      </div>
    </div>
  );
}
