/**
 * Public browse — discover public course lists.
 */
import { ListVideo } from "lucide-react";
import PlaylistBrowseGrid from "./PlaylistBrowseGrid";

export const metadata = {
  title: "Course Lists",
  description: "Curated learning paths and course collections.",
};

export default function BrowsePlaylistsPage() {
  return (
    <div className="px-4 py-8">
      <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
        <ListVideo className="w-7 h-7 text-orange-500" /> Course Lists
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Curated collections of courses — organized by topic, learning path, and
        skill level.
      </p>
      <PlaylistBrowseGrid />
    </div>
  );
}
