"use client";

import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabase/client";
import { channels, events } from "@/lib/realtime/channels";
import { ClipboardList, Megaphone, MessageCircle, Video } from "lucide-react";
import { Button } from "@/components/ui/Button";
import ClassChatPanel from "./ClassChatPanel";
import StudentAssignmentsPanel from "./StudentAssignmentsPanel";

type Announcement = { id: string; title: string; body: string; createdAt: string; author: { name: string } };
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
  const [tab, setTab] = useState<"announcements" | "assignments" | "chat" | "live">("announcements");

  return (
    <div className="glass rounded-xl">
      <div className="flex border-b border-border overflow-x-auto">
        <TabBtn active={tab === "announcements"} onClick={() => setTab("announcements")} icon={Megaphone} label="Announcements" />
        <TabBtn active={tab === "assignments"} onClick={() => setTab("assignments")} icon={ClipboardList} label="Assignments" />
        {enableChat && <TabBtn active={tab === "chat"} onClick={() => setTab("chat")} icon={MessageCircle} label="Chat" />}
        <TabBtn active={tab === "live"} onClick={() => setTab("live")} icon={Video} label="Live" />
      </div>
      <div className="p-4">
        {tab === "announcements" && <AnnouncementsPanel classId={classId} />}
        {tab === "assignments" && <StudentAssignmentsPanel classId={classId} />}
        {tab === "chat" && <ClassChatPanel classId={classId} />}
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

  const upcoming = items
    .filter((s) => s.status === "SCHEDULED" || s.status === "LIVE")
    .map((s) => ({ s, t: new Date(s.scheduledAt).getTime() }))
    .sort((a, b) => a.t - b.t)[0];
  const reminderMins = upcoming
    ? Math.round((upcoming.t - Date.now()) / 60000)
    : null;
  const showReminder =
    upcoming &&
    (upcoming.s.status === "LIVE" ||
      (reminderMins !== null && reminderMins >= 0 && reminderMins <= 15));

  return (
    <div className="space-y-3">
      {showReminder && upcoming && (
        <div
          className={`p-3 rounded-lg flex items-center gap-3 border ${
            upcoming.s.status === "LIVE"
              ? "border-emerald-400/40 bg-emerald-500/10"
              : "border-amber-400/40 bg-amber-500/10"
          }`}
        >
          <Video className={`w-4 h-4 ${upcoming.s.status === "LIVE" ? "text-emerald-400" : "text-amber-400"}`} />
          <div className="flex-1 text-sm">
            {upcoming.s.status === "LIVE"
              ? `Live now — ${upcoming.s.title}`
              : `Starting in ${reminderMins} min — ${upcoming.s.title}`}
          </div>
          {upcoming.s.meetingUrl && (
            <a href={upcoming.s.meetingUrl} target="_blank" rel="noreferrer">
              <Button size="sm" variant={upcoming.s.status === "LIVE" ? "success" : "primary"}>
                {upcoming.s.status === "LIVE" ? "Join" : "Open"}
              </Button>
            </a>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {items.length} session{items.length === 1 ? "" : "s"}
        </div>
        <a
          href={`/api/classes/${classId}/live-sessions/calendar`}
          className="text-xs text-amber-400 hover:underline"
        >
          Subscribe / download .ics
        </a>
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-6">
          No sessions scheduled.
        </div>
      ) : (
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
              <a
                href={`/api/classes/${classId}/live-sessions/${s.id}/calendar`}
                title="Add to calendar"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                + cal
              </a>
              {s.status === "LIVE" && s.meetingUrl && (
                <a href={s.meetingUrl} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="success">Join</Button>
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
