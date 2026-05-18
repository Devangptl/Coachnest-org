/**
 * Instructor: Create a new course list
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ListVideo } from "lucide-react";
import { getSession } from "@/lib/auth";
import PlaylistForm from "@/components/playlists/PlaylistForm";

export default async function NewPlaylistPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "STUDENT") redirect("/dashboard");

  return (
    <div className="px-4 max-w-2xl mx-auto">
      <Link
        href="/instructor/playlists"
        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3"
      >
        <ArrowLeft className="w-3 h-3" /> Back to lists
      </Link>
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-1">
        <ListVideo className="w-6 h-6 text-orange-500" /> New course list
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Set the basics — you&apos;ll add courses on the next step.
      </p>
      <div className="glass p-5 rounded-xl">
        <PlaylistForm mode="create" manageBasePath="/instructor/playlists" />
      </div>
    </div>
  );
}
