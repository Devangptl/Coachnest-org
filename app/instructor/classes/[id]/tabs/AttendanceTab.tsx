"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Loader2, ClipboardCheck } from "lucide-react";

type Session = { id: string; title: string; scheduledAt: string; status: string };
type Student = { id: string; user: { id: string; name: string; avatar: string | null } };

export default function AttendanceTab({ classId }: { classId: string }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [marks, setMarks] = useState<Record<string, "PRESENT" | "ABSENT" | "LATE" | "EXCUSED">>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [s, e] = await Promise.all([
        fetch(`/api/classes/${classId}/live-sessions`).then((r) => r.json()),
        fetch(`/api/classes/${classId}/enrollments?status=APPROVED`).then((r) => r.json()),
      ]);
      setSessions(s.sessions ?? []);
      setStudents(e.enrollments ?? []);
      if (s.sessions?.[0]) setSessionId(s.sessions[0].id);
      setLoading(false);
    })();
  }, [classId]);

  async function save() {
    if (!sessionId) return toast.error("Pick a session first");
    const records = students
      .filter((s) => marks[s.user.id])
      .map((s) => ({ userId: s.user.id, status: marks[s.user.id] }));
    if (records.length === 0) return toast.error("Mark at least one student");
    try {
      const res = await fetch(`/api/classes/${classId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, records }),
      });
      if (!res.ok) throw new Error();
      toast.success("Attendance saved");
    } catch { toast.error("Failed"); }
  }

  if (loading) return <div className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;

  if (sessions.length === 0) {
    return (
      <div className="glass p-10 rounded-xl text-center text-sm text-muted-foreground">
        <ClipboardCheck className="w-10 h-10 text-amber-400/40 mx-auto mb-2" />
        Schedule a live session first to track attendance.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CustomSelect
        value={sessionId}
        onChange={setSessionId}
        options={sessions.map((s) => ({
          value: s.id,
          label: `${s.title} — ${new Date(s.scheduledAt).toLocaleString()}`,
        }))}
      />

      <div className="space-y-2">
        {students.map((s) => (
          <div key={s.id} className="glass p-3 rounded-lg flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[120px] text-sm">{s.user.name}</div>
            <div className="flex flex-wrap gap-1">
              {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setMarks((m) => ({ ...m, [s.user.id]: st }))}
                  className={`px-2 py-1 text-[10px] font-semibold rounded ${
                    marks[s.user.id] === st
                      ? "bg-amber-500/20 text-amber-400 border border-amber-400/40"
                      : "bg-secondary text-muted-foreground border border-transparent"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button onClick={save}>Save attendance</Button>
    </div>
  );
}
