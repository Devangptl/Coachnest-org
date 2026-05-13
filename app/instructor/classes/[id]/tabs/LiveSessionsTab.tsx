"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Video, Loader2, PlusCircle, Play, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Session = {
  id: string;
  title: string;
  description: string | null;
  scheduledAt: string;
  duration: number;
  meetingUrl: string | null;
  recordingUrl: string | null;
  status: "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";
};

export default function LiveSessionsTab({ classId }: { classId: string }) {
  const [items, setItems] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState("60");
  const [meetingUrl, setMeetingUrl] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/classes/${classId}/live-sessions`);
      const data = await res.json();
      setItems(data.sessions ?? []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line

  async function schedule(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`/api/classes/${classId}/live-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, scheduledAt, duration: parseInt(duration, 10), meetingUrl: meetingUrl || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Scheduled");
      setShowForm(false);
      setTitle(""); setScheduledAt(""); setMeetingUrl("");
      load();
    } catch { toast.error("Failed"); }
  }

  async function act(sessionId: string, action: "start" | "end") {
    try {
      const res = await fetch(`/api/classes/${classId}/live-sessions/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error();
      toast.success(action === "start" ? "Started" : "Ended");
      load();
    } catch { toast.error("Failed"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold">Live sessions</h2>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <PlusCircle className="w-4 h-4" /> Schedule
        </Button>
      </div>

      {showForm && (
        <form onSubmit={schedule} className="glass p-4 rounded-xl space-y-3">
          <input className="input-glass" required placeholder="Session title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="grid sm:grid-cols-2 gap-3">
            <input className="input-glass" type="datetime-local" required value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            <input className="input-glass" type="number" placeholder="Duration (min)" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
          <input className="input-glass" placeholder="Meeting URL (Zoom/Meet)" value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} />
          <Button type="submit" size="sm">Schedule session</Button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="glass p-10 rounded-xl text-center text-sm text-muted-foreground">
          <Video className="w-10 h-10 text-amber-400/40 mx-auto mb-2" />
          No live sessions scheduled.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((s) => (
            <div key={s.id} className="glass p-4 rounded-lg flex items-center gap-3">
              <Video className="w-5 h-5 text-amber-400" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{s.title}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(s.scheduledAt).toLocaleString()} · {s.duration} min · {s.status}
                </div>
              </div>
              {s.status === "SCHEDULED" && (
                <Button size="sm" variant="success" onClick={() => act(s.id, "start")}>
                  <Play className="w-4 h-4" /> Start
                </Button>
              )}
              {s.status === "LIVE" && (
                <Button size="sm" variant="danger" onClick={() => act(s.id, "end")}>
                  <StopCircle className="w-4 h-4" /> End
                </Button>
              )}
              {s.meetingUrl && (
                <a href={s.meetingUrl} target="_blank" rel="noreferrer" className="text-xs text-amber-400 underline">
                  Join
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
