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
    <div className="pt-4 pb-32">
      {/* Header — matches h1 (text-xl + icon) and subtitle layout */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="skeleton w-5 h-5 rounded-md" />
          <div className="skeleton h-6 w-40 rounded-md" />
        </div>
        <div className="skeleton h-3.5 w-28 rounded-md" />
      </div>

      {/* Grid — matches the in-component loading grid exactly */}
      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="skeleton h-44 rounded-md border border-border/60"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Floating search + filter bar placeholder — prevents pop-in */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-3xl">
        <div className="w-full flex items-center bg-background/80 backdrop-blur-2xl border border-border/60 shadow-[0_2px_12px_rgba(0,0,0,0.12)] rounded-full p-1.5">
          <div className="flex items-center gap-2 flex-1 px-4 min-w-0 py-2">
            <div className="skeleton w-4 h-4 rounded-full flex-shrink-0" />
            <div className="skeleton h-3.5 w-40 rounded-md" />
          </div>
          <div className="w-px h-5 bg-border/50 mx-0.5 flex-shrink-0" />
          <div className="flex items-center gap-1.5 pl-3 pr-4 py-2.5">
            <div className="skeleton w-4 h-4 rounded-md" />
            <div className="skeleton hidden sm:block h-3.5 w-12 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
