/**
 * Admin: manage any course list.
 */
import PlaylistManageShell from "@/components/playlists/PlaylistManageShell";

export default async function AdminPlaylistManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="px-4 max-w-4xl mx-auto">
      <PlaylistManageShell
        id={id}
        manageBasePath="/admin/playlists"
        backHref="/admin/playlists"
      />
    </div>
  );
}
