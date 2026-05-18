"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ListVideo,
  ArrowLeft,
  ExternalLink,
  Trash2,
  Loader2,
  Lock,
  Globe,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { useConfirm } from "@/components/ui/UIDialogProvider";
import { Skeleton } from "@/components/ui/Skeleton";
import SharePlaylistButton from "@/components/SharePlaylistButton";
import PlaylistForm from "./PlaylistForm";
import PlaylistCourseManager from "./PlaylistCourseManager";

interface PlaylistMeta {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  owner: { id: string; name: string };
  _count: { items: number; followers: number };
}

export default function PlaylistManageShell({
  id,
  manageBasePath,
  backHref,
}: {
  id: string;
  manageBasePath: string;
  backHref: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [playlist, setPlaylist] = useState<PlaylistMeta | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "denied">("loading");
  const [deleting, setDeleting] = useState(false);

  async function load() {
    try {
      const res = await fetch(`/api/playlists/${id}`);
      if (!res.ok) {
        setState("denied");
        return;
      }
      const data = await res.json();
      if (!data.canManage) {
        setState("denied");
        return;
      }
      setPlaylist(data.playlist);
      setState("ok");
    } catch {
      setState("denied");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function del() {
    if (!playlist) return;
    const ok = await confirm(
      `Delete "${playlist.title}"? This can't be undone. Courses themselves are not affected.`,
      { title: "Delete list", confirmText: "Delete" },
    );
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/playlists/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("List deleted");
      router.push(backHref);
    } catch {
      toast.error("Failed to delete");
      setDeleting(false);
    }
  }

  if (state === "loading") {
    return (
      <div className="space-y-4">
        <Skeleton h="h-8" w="w-1/3" />
        <Skeleton h="h-10" className="w-full rounded-lg" />
        <Skeleton h="h-64" className="w-full rounded-xl" />
      </div>
    );
  }

  if (state === "denied" || !playlist) {
    return (
      <div className="glass p-12 rounded-xl text-center">
        <p className="text-muted-foreground">
          This list doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Link href={backHref} className="btn-primary inline-flex mt-4">
          Back to lists
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <Link
            href={backHref}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1"
          >
            <ArrowLeft className="w-3 h-3" /> Back to lists
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2 truncate">
            <ListVideo className="w-6 h-6 text-orange-500 flex-shrink-0" />
            {playlist.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
            {playlist.visibility === "PUBLIC" ? (
              <>
                <Globe className="w-3 h-3" /> Public
              </>
            ) : (
              <>
                <Lock className="w-3 h-3" /> Private
              </>
            )}
            · {playlist._count.followers} follower
            {playlist._count.followers !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {playlist.visibility === "PUBLIC" && (
            <>
              <SharePlaylistButton slug={playlist.slug} />
              <Link
                href={`/playlists/${playlist.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-[#d97757]/50 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" /> View
              </Link>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="courses">
        <TabsList className="max-w-sm">
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="courses">
          <PlaylistCourseManager playlistId={id} />
        </TabsContent>

        <TabsContent value="details">
          <div className="glass p-5 rounded-xl">
            <PlaylistForm
              mode="edit"
              playlistId={id}
              initial={{
                title: playlist.title,
                description: playlist.description,
                coverImage: playlist.coverImage,
                visibility: playlist.visibility,
              }}
              onSaved={load}
            />
          </div>

          <div className="mt-4 glass p-5 rounded-xl border border-red-400/20">
            <h3 className="text-sm font-semibold text-red-400 mb-1">
              Danger zone
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Deleting a list is permanent. The courses inside are not deleted.
            </p>
            <Button variant="danger" size="sm" onClick={del} loading={deleting}>
              <Trash2 className="w-4 h-4" /> Delete this list
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
