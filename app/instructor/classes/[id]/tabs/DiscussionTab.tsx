"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Discussion = {
  id: string;
  title: string;
  body: string;
  kind: string;
  createdAt: string;
  author: { id: string; name: string; avatar: string | null };
  _count: { replies: number };
};

export default function DiscussionTab({ classId }: { classId: string }) {
  const [items, setItems] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/classes/${classId}/discussions`);
      const d = await r.json();
      setItems(d.discussions ?? []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`/api/classes/${classId}/discussions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, kind: "GENERAL" }),
      });
      if (!res.ok) throw new Error();
      setTitle(""); setBody("");
      load();
    } catch { toast.error("Failed"); }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="glass p-4 rounded-xl space-y-2">
        <input className="input-glass" placeholder="Topic title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea className="input-glass min-h-[80px]" placeholder="Start the discussion…" value={body} onChange={(e) => setBody(e.target.value)} required />
        <Button type="submit" size="sm">Post</Button>
      </form>

      {loading ? (
        <div className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
      ) : items.length === 0 ? (
        <div className="glass p-10 rounded-xl text-center text-sm text-muted-foreground">
          <MessageCircle className="w-10 h-10 text-amber-400/40 mx-auto mb-2" />
          No discussions yet.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((d) => (
            <div key={d.id} className="glass p-4 rounded-lg">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <span className="font-medium text-foreground">{d.author.name}</span>
                <span>· {new Date(d.createdAt).toLocaleDateString()}</span>
                <span>· {d._count.replies} replies</span>
              </div>
              <div className="font-semibold text-sm">{d.title}</div>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{d.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
