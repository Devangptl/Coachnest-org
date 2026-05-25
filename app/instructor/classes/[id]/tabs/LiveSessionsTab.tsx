"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Video,
  Loader2,
  PlusCircle,
  Play,
  StopCircle,
  CalendarDays,
  List,
  ChevronLeft,
  ChevronRight,
  Download,
  Copy,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DateTimeInput } from "@/components/ui/DateTimeInput";

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

const STATUS_STYLE: Record<Session["status"], string> = {
  SCHEDULED: "bg-sky-500/15 text-sky-400 border-sky-400/30",
  LIVE: "bg-emerald-500/15 text-emerald-400 border-emerald-400/30",
  ENDED: "bg-secondary text-muted-foreground border-border",
  CANCELLED: "bg-red-500/15 text-red-400 border-red-400/30",
};

export default function LiveSessionsTab({ classId }: { classId: string }) {
  const [items, setItems] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Session | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/classes/${classId}/live-sessions`);
      const data = await res.json();
      setItems(data.sessions ?? []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [classId]); // eslint-disable-line

  async function act(sessionId: string, action: "start" | "end") {
    try {
      const res = await fetch(
        `/api/classes/${classId}/live-sessions/${sessionId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      if (!res.ok) throw new Error();
      toast.success(action === "start" ? "Session started" : "Session ended");
      load();
    } catch {
      toast.error("Failed");
    }
  }

  async function copyFeed() {
    const url = `${window.location.origin}/api/classes/${classId}/live-sessions/calendar`;
    await navigator.clipboard.writeText(url);
    toast.success("Calendar feed URL copied — paste it into Google/Outlook to subscribe");
  }

  function downloadFeed() {
    window.location.href = `/api/classes/${classId}/live-sessions/calendar`;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div>
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Video className="w-5 h-5 text-amber-400" /> Live sessions
          </h2>
          <p className="text-xs text-muted-foreground">
            Schedule classes, share calendar links, run live.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setView("calendar")}
              className={`px-2.5 py-1.5 text-xs font-medium flex items-center gap-1 ${
                view === "calendar" ? "bg-secondary" : "text-muted-foreground"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" /> Calendar
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-2.5 py-1.5 text-xs font-medium flex items-center gap-1 border-l border-border ${
                view === "list" ? "bg-secondary" : "text-muted-foreground"
              }`}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
          </div>
          <Button size="sm" variant="secondary" onClick={copyFeed}>
            <Copy className="w-3.5 h-3.5" /> Copy feed
          </Button>
          <Button size="sm" variant="secondary" onClick={downloadFeed}>
            <Download className="w-3.5 h-3.5" /> Download .ics
          </Button>
          <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
            <PlusCircle className="w-4 h-4" /> Schedule
          </Button>
        </div>
      </div>

      <UpcomingBanner sessions={items} />

      {showForm && (
        <SessionForm
          classId={classId}
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
        />
      )}

      {loading ? (
        <div className="text-center py-10">
          <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : view === "calendar" ? (
        <MonthCalendar
          sessions={items}
          onCreateOnDate={(date) => {
            setEditing({
              id: "",
              title: "",
              description: null,
              scheduledAt: date.toISOString(),
              duration: 60,
              meetingUrl: null,
              recordingUrl: null,
              status: "SCHEDULED",
            });
            setShowForm(true);
          }}
          onEdit={(s) => { setEditing(s); setShowForm(true); }}
          onAct={act}
        />
      ) : (
        <SessionList items={items} onEdit={(s) => { setEditing(s); setShowForm(true); }} onAct={act} />
      )}
    </div>
  );
}

// ─── Up-next banner ───────────────────────────────────────────────────────────

function UpcomingBanner({ sessions }: { sessions: Session[] }) {
  const next = useMemo(() => {
    const now = Date.now();
    return sessions
      .filter((s) => s.status === "SCHEDULED" || s.status === "LIVE")
      .map((s) => ({ s, when: new Date(s.scheduledAt).getTime() }))
      .filter((x) => x.s.status === "LIVE" || x.when >= now)
      .sort((a, b) => a.when - b.when)[0];
  }, [sessions]);

  if (!next) return null;
  const minsAway = Math.round((next.when - Date.now()) / 60000);
  const live = next.s.status === "LIVE";
  const within15 = !live && minsAway >= 0 && minsAway <= 15;

  if (!live && !within15) return null;

  return (
    <div
      className={`glass p-3 rounded-xl flex items-center gap-3 border ${
        live ? "border-emerald-400/40" : "border-amber-400/40"
      }`}
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center ${
          live ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
        }`}
      >
        {live ? <Video className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">
          {live ? "Live now — " : `Starting in ${minsAway} min — `}
          {next.s.title}
        </div>
        <div className="text-xs text-muted-foreground">
          {new Date(next.s.scheduledAt).toLocaleString()} · {next.s.duration} min
        </div>
      </div>
      {next.s.meetingUrl && (
        <a href={next.s.meetingUrl} target="_blank" rel="noreferrer">
          <Button size="sm" variant={live ? "success" : "primary"}>
            <ExternalLink className="w-3.5 h-3.5" />
            {live ? "Join now" : "Open link"}
          </Button>
        </a>
      )}
    </div>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────

function SessionList({
  items,
  onEdit,
  onAct,
}: {
  items: Session[];
  onEdit: (s: Session) => void;
  onAct: (id: string, action: "start" | "end") => void;
}) {
  if (items.length === 0) {
    return (
      <div className="glass p-10 rounded-xl text-center text-sm text-muted-foreground">
        <Video className="w-10 h-10 text-amber-400/40 mx-auto mb-2" />
        No live sessions scheduled.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {items.map((s) => (
        <div key={s.id} className="glass p-3 rounded-lg flex items-center gap-3">
          <Video className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <button
                onClick={() => onEdit(s)}
                className="font-medium text-sm hover:underline"
              >
                {s.title}
              </button>
              <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${STATUS_STYLE[s.status]}`}>
                {s.status}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(s.scheduledAt).toLocaleString()} · {s.duration} min
            </div>
          </div>
          {s.status === "SCHEDULED" && (
            <Button size="sm" variant="success" onClick={() => onAct(s.id, "start")}>
              <Play className="w-4 h-4" /> Start
            </Button>
          )}
          {s.status === "LIVE" && (
            <Button size="sm" variant="danger" onClick={() => onAct(s.id, "end")}>
              <StopCircle className="w-4 h-4" /> End
            </Button>
          )}
          {s.meetingUrl && (
            <a
              href={s.meetingUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-amber-400 hover:underline"
            >
              Join
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Month calendar grid ──────────────────────────────────────────────────────

function MonthCalendar({
  sessions,
  onCreateOnDate,
  onEdit,
  onAct,
}: {
  sessions: Session[];
  onCreateOnDate: (date: Date) => void;
  onEdit: (s: Session) => void;
  onAct: (id: string, action: "start" | "end") => void;
}) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selected, setSelected] = useState<string | null>(
    new Date().toISOString().slice(0, 10),
  );

  const byDay = useMemo(() => {
    const m = new Map<string, Session[]>();
    for (const s of sessions) {
      const key = new Date(s.scheduledAt).toISOString().slice(0, 10);
      const list = m.get(key) ?? [];
      list.push(s);
      m.set(key, list);
    }
    for (const list of m.values()) {
      list.sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));
    }
    return m;
  }, [sessions]);

  const cells = useMemo(() => buildMonthGrid(cursor), [cursor]);
  const todayKey = new Date().toISOString().slice(0, 10);
  const selectedSessions = selected ? byDay.get(selected) ?? [] : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold">
          {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const d = new Date(cursor);
              d.setMonth(d.getMonth() - 1);
              setCursor(d);
            }}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const d = new Date();
              d.setDate(1);
              d.setHours(0, 0, 0, 0);
              setCursor(d);
              setSelected(new Date().toISOString().slice(0, 10));
            }}
          >
            Today
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const d = new Date(cursor);
              d.setMonth(d.getMonth() + 1);
              setCursor(d);
            }}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="glass rounded-xl p-2">
        {/* Weekday header */}
        <div className="grid grid-cols-7 gap-px mb-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div
              key={d}
              className="text-[10px] uppercase font-semibold text-muted-foreground text-center py-1"
            >
              {d}
            </div>
          ))}
        </div>
        {/* Cells */}
        <div className="grid grid-cols-7 gap-px">
          {cells.map(({ date, inMonth }) => {
            const key = date.toISOString().slice(0, 10);
            const dayItems = byDay.get(key) ?? [];
            const isToday = key === todayKey;
            const isSelected = key === selected;
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                onDoubleClick={() => {
                  const d = new Date(date);
                  d.setHours(10, 0, 0, 0);
                  onCreateOnDate(d);
                }}
                className={`min-h-[68px] p-1.5 rounded-lg text-left flex flex-col gap-1 transition-colors ${
                  isSelected
                    ? "bg-amber-500/10 border border-amber-400/30"
                    : "hover:bg-secondary border border-transparent"
                } ${!inMonth ? "opacity-40" : ""}`}
              >
                <div
                  className={`text-xs ${
                    isToday ? "font-bold text-amber-400" : "text-muted-foreground"
                  }`}
                >
                  {date.getDate()}
                </div>
                <div className="space-y-0.5 overflow-hidden">
                  {dayItems.slice(0, 2).map((s) => (
                    <div
                      key={s.id}
                      className={`text-[10px] font-medium truncate px-1 py-0.5 rounded ${
                        s.status === "LIVE"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : s.status === "ENDED"
                          ? "bg-secondary text-muted-foreground"
                          : s.status === "CANCELLED"
                          ? "bg-red-500/20 text-red-300 line-through"
                          : "bg-sky-500/20 text-sky-300"
                      }`}
                    >
                      {fmtTime(s.scheduledAt)} {s.title}
                    </div>
                  ))}
                  {dayItems.length > 2 && (
                    <div className="text-[10px] text-muted-foreground">
                      +{dayItems.length - 2} more
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selected && (
        <div className="glass rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium text-sm">
              {new Date(selected).toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </div>
            <button
              onClick={() => {
                const d = new Date(selected);
                d.setHours(10, 0, 0, 0);
                onCreateOnDate(d);
              }}
              className="text-xs text-amber-400 hover:underline"
            >
              + Add session
            </button>
          </div>
          {selectedSessions.length === 0 ? (
            <div className="text-xs text-muted-foreground py-3 text-center">
              No sessions on this day.
            </div>
          ) : (
            <div className="space-y-1.5">
              {selectedSessions.map((s) => (
                <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary">
                  <div className="text-xs font-mono text-muted-foreground w-12 shrink-0">
                    {fmtTime(s.scheduledAt)}
                  </div>
                  <button
                    onClick={() => onEdit(s)}
                    className="flex-1 min-w-0 text-left hover:underline"
                  >
                    <div className="text-sm font-medium truncate">{s.title}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {s.duration} min ·{" "}
                      <span className={`uppercase font-bold ${
                        s.status === "LIVE" ? "text-emerald-400" : ""
                      }`}>{s.status}</span>
                    </div>
                  </button>
                  {s.status === "SCHEDULED" && (
                    <Button size="sm" variant="success" onClick={() => onAct(s.id, "start")}>
                      <Play className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {s.status === "LIVE" && (
                    <Button size="sm" variant="danger" onClick={() => onAct(s.id, "end")}>
                      <StopCircle className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function buildMonthGrid(monthStart: Date) {
  // Sunday-first 6-week grid.
  const first = new Date(monthStart);
  const firstWeekday = first.getDay(); // 0=Sun
  const start = new Date(first);
  start.setDate(start.getDate() - firstWeekday);

  const out: Array<{ date: Date; inMonth: boolean }> = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    out.push({ date: d, inMonth: d.getMonth() === monthStart.getMonth() });
  }
  return out;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Form (create / edit) ─────────────────────────────────────────────────────

function SessionForm({
  classId,
  initial,
  onClose,
  onSaved,
}: {
  classId: string;
  initial: Session | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [scheduledAt, setScheduledAt] = useState(
    initial?.scheduledAt ? toLocalInput(initial.scheduledAt) : "",
  );
  const [duration, setDuration] = useState(String(initial?.duration ?? 60));
  const [meetingUrl, setMeetingUrl] = useState(initial?.meetingUrl ?? "");
  const [busy, setBusy] = useState(false);

  const isEditing = !!initial?.id;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = {
        title,
        description: description || null,
        scheduledAt: new Date(scheduledAt).toISOString(),
        duration: parseInt(duration, 10),
        meetingUrl: meetingUrl || null,
      };
      // No PATCH endpoint exists yet; treat edit as a no-op create until backend supports it.
      if (isEditing) {
        toast("Editing existing sessions isn't supported yet — create a new one and end this one.", {
          icon: "ℹ️",
        });
        setBusy(false);
        return;
      }
      const res = await fetch(`/api/classes/${classId}/live-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed");
      }
      toast.success("Scheduled");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="glass p-4 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">
          {isEditing ? "Session details" : "Schedule live session"}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
      <input
        className="input-glass"
        required
        placeholder="Session title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="input-glass min-h-[60px]"
        placeholder="Description (shown in the calendar invite)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="grid sm:grid-cols-2 gap-3">
        <DateTimeInput
          type="datetime-local"
          required
          value={scheduledAt}
          onChange={setScheduledAt}
        />
        <input
          className="input-glass"
          type="number"
          min={5}
          placeholder="Duration (min)"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />
      </div>
      <input
        className="input-glass"
        placeholder="Meeting URL (Zoom, Meet, etc.)"
        value={meetingUrl}
        onChange={(e) => setMeetingUrl(e.target.value)}
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" loading={busy}>
          {isEditing ? "Save" : "Schedule"}
        </Button>
      </div>
    </form>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
}
