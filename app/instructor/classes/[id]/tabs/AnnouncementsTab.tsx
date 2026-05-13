"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Megaphone, Pin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Announcement = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  author: { id: string; name: string; avatar: string | null };
};

export default function AnnouncementsTab({ classId }: { classId: string }) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/classes/${classId}/announcements`);
      const d = await r.json();
      setItems(d.announcements ?? []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`/api/classes/${classId}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, pinned }),
      });
      if (!res.ok) throw new Error();
      toast.success("Announcement posted");
      setTitle(""); setBody(""); setPinned(false);
      load();
    } catch { toast.error("Failed"); }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="glass p-4 rounded-xl space-y-2">
        <input className="input-glass" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea className="input-glass min-h-[100px]" placeholder="What's new?" value={body} onChange={(e) => setBody(e.target.value)} required />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
            Pin to top
          </label>
          <Button type="submit" size="sm">Post announcement</Button>
        </div>
      </form>

      {loading ? (
        <div className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
      ) : items.length === 0 ? (
        <div className="glass p-10 rounded-xl text-center text-sm text-muted-foreground">
          <Megaphone className="w-10 h-10 text-amber-400/40 mx-auto mb-2" />
          No announcements yet.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <div key={a.id} className="glass p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                {a.pinned && <Pin className="w-3 h-3 text-amber-400" />}
                <span className="font-semibold text-sm">{a.title}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(a.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{a.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
