import { Suspense } from "react";
import type { Metadata } from "next";
import PlaylistBrowseGrid from "./PlaylistBrowseGrid";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://coachnest.com";

export const metadata: Metadata = {
  title: "Course Lists",
  description: "Curated learning paths and course collections.",
  alternates: { canonical: `${BASE_URL}/playlists` },
};

export default function BrowsePlaylistsPage() {
  return (
    <Suspense fallback={<PlaylistsPageSkeleton />}>
      <PlaylistBrowseGrid />
    </Suspense>
  );
}

function PlaylistsPageSkeleton() {
  return (
    <div className="pt-4 pb-32 animate-pulse">
      <div className="mb-6">
        <div className="h-6 w-44 bg-secondary rounded-md mb-2" />
        <div className="h-3 w-32 bg-secondary/70 rounded-md" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-44 bg-secondary rounded-md" />
        ))}
      </div>
    </div>
  );
}
