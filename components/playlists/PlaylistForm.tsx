"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Lock, Save } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import ImageUpload from "@/components/ImageUpload";

type Visibility = "PUBLIC" | "PRIVATE";

interface Props {
  mode: "create" | "edit";
  playlistId?: string;
  /** Where to send the user after creating (manage base path). */
  manageBasePath?: string;
  initial?: {
    title: string;
    description: string | null;
    coverImage: string | null;
    visibility: Visibility;
  };
  onSaved?: () => void;
}

export default function PlaylistForm({
  mode,
  playlistId,
  manageBasePath = "/instructor/playlists",
  initial,
  onSaved,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [coverImage, setCoverImage] = useState(initial?.coverImage ?? "");
  const [visibility, setVisibility] = useState<Visibility>(
    initial?.visibility ?? "PUBLIC",
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    if (title.trim().length < 3) {
      toast.error("Title must be at least 3 characters");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        coverImage: coverImage || null,
        visibility,
      };
      const res = await fetch(
        mode === "create" ? "/api/playlists" : `/api/playlists/${playlistId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to save");
      }
      const data = await res.json();
      if (mode === "create") {
        toast.success("List created — now add courses");
        router.push(`${manageBasePath}/${data.playlist.id}`);
      } else {
        toast.success("Saved");
        onSaved?.();
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium block mb-1.5">
          Title <span className="text-red-400">*</span>
        </span>
        <input
          className="input-glass"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Frontend Learning Path"
          maxLength={120}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium block mb-1.5">Description</span>
        <textarea
          className="input-glass min-h-[100px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this list about? Who is it for?"
          maxLength={5000}
        />
      </label>

      <div>
        <span className="text-sm font-medium block mb-1.5">Cover image</span>
        <ImageUpload
          value={coverImage}
          onChange={setCoverImage}
          folder="misc"
          compact
        />
      </div>

      <div>
        <span className="text-sm font-medium block mb-1.5">Visibility</span>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              {
                v: "PUBLIC" as const,
                icon: Globe,
                title: "Public",
                desc: "Anyone can find and follow this list",
              },
              {
                v: "PRIVATE" as const,
                icon: Lock,
                title: "Private",
                desc: "Only you (and admins) can see it",
              },
            ]
          ).map(({ v, icon: Icon, title: t, desc }) => (
            <button
              key={v}
              type="button"
              onClick={() => setVisibility(v)}
              className={`text-left p-3 rounded-lg border transition-all ${
                visibility === v
                  ? "border-orange-500/50 bg-orange-500/5"
                  : "border-border hover:border-orange-500/30"
              }`}
            >
              <div className="font-semibold text-sm flex items-center gap-1.5">
                <Icon className="w-4 h-4 text-orange-500" /> {t}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} loading={saving}>
          <Save className="w-4 h-4" />
          {mode === "create" ? "Create list" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
