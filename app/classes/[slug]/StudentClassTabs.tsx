"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseClient } from "@/lib/supabase/client";
import { channels, events } from "@/lib/realtime/channels";
import { Megaphone, MessageCircle, Video, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

type Announcement = { id: string; title: string; body: string; createdAt: string; author: { name: string } };
type ChatMsg = { id: string; content: string; createdAt: string; author: { id: string; name: string; avatar: string | null } };
type LiveSession = { id: string; title: string; scheduledAt: string; meetingUrl: string | null; status: string };

export default function StudentClassTabs({
  classId,
  enableChat,
  enableDiscussion,
}: {
  classId: string;
  enableChat: boolean;
  enableDiscussion: boolean;
}) {
  const [tab, setTab] = useState<"announcements" | "chat" | "live">("announcements");

  return (
    <div className="glass rounded-xl">
      <div className="flex border-b border-border">
        <TabBtn active={tab === "announcements"} onClick={() => setTab("announcements")} icon={Megaphone} label="Announcements" />
        {enableChat && <TabBtn active={tab === "chat"} onClick={() => setTab("chat")} icon={MessageCircle} label="Chat" />}
        <TabBtn active={tab === "live"} onClick={() => setTab("live")} icon={Video} label="Live" />
      </div>
      <div className="p-4">
        {tab === "announcements" && <AnnouncementsPanel classId={classId} />}
        {tab === "chat" && <ChatPanel classId={classId} />}
        {tab === "live" && <LivePanel classId={classId} />}
      </div>
    </div>
  );
}

function TabBtn({
  active, onClick, icon: Icon, label,
}: {
  active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium ${
        active ? "text-amber-400 border-b-2 border-amber-400" : "text-muted-foreground"
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

function AnnouncementsPanel({ classId }: { classId: string }) {
  const [items, setItems] = useState<Announcement[]>([]);

  async function load() {
    const r = await fetch(`/api/classes/${classId}/announcements`);
    const d = await r.json();
    setItems(d.announcements ?? []);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line

  useEffect(() => {
    const sb = supabaseClient;
    const ch = sb.channel(channels.classAnnouncements(classId));
    ch.on("broadcast", { event: events.classAnnouncement }, () => load()).subscribe();
    return () => { sb.removeChannel(ch); };
  }, [classId]); // eslint-disable-line

  if (items.length === 0) {
    return <div className="text-sm text-muted-foreground text-center py-6">No announcements yet.</div>;
  }
  return (
    <div className="space-y-3">
      {items.map((a) => (
        <div key={a.id} className="p-3 rounded-lg bg-secondary">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-sm">{a.title}</span>
            <span className="text-[10px] text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</span>
          </div>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{a.body}</p>
          <div className="text-[10px] text-muted-foreground mt-1">— {a.author.name}</div>
        </div>
      ))}
    </div>
  );
}

function ChatPanel({ classId }: { classId: string }) {
  const [items, setItems] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    const r = await fetch(`/api/classes/${classId}/messages`);
    const d = await r.json();
    setItems(d.messages ?? []);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  useEffect(() => {
    const sb = supabaseClient;
    const ch = sb.channel(channels.classChat(classId));
    ch.on("broadcast", { event: events.classChatMessage }, ({ payload }) => {
      setItems((prev) => [...prev, payload as ChatMsg]);
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
    } catch { toast.error("Could not send"); }
  }

  return (
    <div className="flex flex-col h-[400px]">
      <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1">
        {items.length === 0 ? (
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

function LivePanel({ classId }: { classId: string }) {
  const [items, setItems] = useState<LiveSession[]>([]);

  async function load() {
    const r = await fetch(`/api/classes/${classId}/live-sessions`);
    const d = await r.json();
    setItems(d.sessions ?? []);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  useEffect(() => {
    const sb = supabaseClient;
    const ch = sb.channel(channels.classLive(classId));
    ch.on("broadcast", { event: events.classLiveStarted }, () => load())
      .on("broadcast", { event: events.classLiveEnded }, () => load())
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [classId]); // eslint-disable-line

  if (items.length === 0) {
    return <div className="text-sm text-muted-foreground text-center py-6">No sessions scheduled.</div>;
  }
  return (
    <div className="space-y-2">
      {items.map((s) => (
        <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary">
          <Video className="w-4 h-4 text-amber-400" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{s.title}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(s.scheduledAt).toLocaleString()} · {s.status}
            </div>
          </div>
          {s.status === "LIVE" && s.meetingUrl && (
            <a href={s.meetingUrl} target="_blank" rel="noreferrer">
              <Button size="sm" variant="success">Join</Button>
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
