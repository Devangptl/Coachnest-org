"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseClient } from "@/lib/supabase/client";
import { channels, events } from "@/lib/realtime/channels";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

type ChatMsg = {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string; avatar: string | null };
};

/**
 * Class-wide live chat. Shared between the class detail tabs and the
 * course reader slide-over so there is a single source of truth.
 */
export default function ClassChatPanel({
  classId,
  heightClass = "h-[400px]",
}: {
  classId: string;
  heightClass?: string;
}) {
  const [items, setItems] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const r = await fetch(`/api/classes/${classId}/messages`);
      const d = await r.json();
      setItems(d.messages ?? []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  useEffect(() => {
    const sb = supabaseClient;
    const ch = sb.channel(channels.classChat(classId));
    ch.on("broadcast", { event: events.classChatMessage }, ({ payload }) => {
      setItems((prev) =>
        prev.some((m) => m.id === (payload as ChatMsg).id)
          ? prev
          : [...prev, payload as ChatMsg],
      );
    }).subscribe();
    return () => { sb.removeChannel(ch); };
  }, [classId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [items]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const content = text;
    setText("");
    try {
      await fetch(`/api/classes/${classId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
    } catch {
      toast.error("Could not send");
    }
  }

  return (
    <div className={`flex flex-col ${heightClass}`}>
      <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1">
        {loading ? (
          <div className="text-sm text-muted-foreground text-center py-6">Loading chat…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6">Be the first to say hi!</div>
        ) : (
          items.map((m) => (
            <div key={m.id} className="text-sm">
              <span className="font-semibold text-amber-400">{m.author.name}: </span>
              <span>{m.content}</span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex gap-2">
        <input
          className="input-glass flex-1"
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
        />
        <Button type="submit" size="icon"><Send className="w-4 h-4" /></Button>
      </form>
    </div>
  );
}
