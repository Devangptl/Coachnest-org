/**
 * Instructor: Manage a course list (details + courses).
 */
import PlaylistManageShell from "@/components/playlists/PlaylistManageShell";

export default async function InstructorPlaylistManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="px-4 max-w-4xl mx-auto">
      <PlaylistManageShell
        id={id}
        manageBasePath="/instructor/playlists"
        backHref="/instructor/playlists"
      />
    </div>
  );
}
