"use client";

import { useEffect, useState } from "react";
import { Loader2, Trophy } from "lucide-react";

export default function AnalyticsTab({ classId }: { classId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/classes/${classId}/analytics`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [classId]);

  if (loading) return <div className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;
  if (!data || data.error) return <div className="text-sm text-muted-foreground">No analytics available.</div>;

  const enrollByStatus: Record<string, number> = {};
  for (const row of data.enrollments ?? []) {
    enrollByStatus[row.status] = row._count?._all ?? 0;
  }
  const attendByStatus: Record<string, number> = {};
  for (const row of data.attendance ?? []) {
    attendByStatus[row.status] = row._count?._all ?? 0;
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Approved" value={enrollByStatus.APPROVED ?? 0} />
        <Stat label="Pending" value={enrollByStatus.PENDING ?? 0} />
        <Stat label="Waitlisted" value={enrollByStatus.WAITLISTED ?? 0} />
        <Stat label="Live sessions" value={data.sessions} />
      </div>

      <div className="glass p-5 rounded-xl">
        <h3 className="font-semibold mb-3">Attendance summary</h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          {["PRESENT", "ABSENT", "LATE", "EXCUSED"].map((k) => (
            <div key={k}>
              <div className="text-2xl font-bold">{attendByStatus[k] ?? 0}</div>
              <div className="text-[10px] uppercase font-semibold text-muted-foreground">{k}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass p-5 rounded-xl">
        <h3 className="font-semibold flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-amber-400" /> Leaderboard
        </h3>
        {data.leaderboard?.length ? (
          <div className="space-y-1">
            {data.leaderboard.map((e: any, i: number) => (
              <div key={e.id} className="flex items-center gap-3 py-1.5">
                <span className="text-sm font-bold w-6 text-center text-amber-400">{i + 1}</span>
                <span className="flex-1 text-sm">{e.user.name}</span>
                <span className="text-xs text-muted-foreground">
                  {e.xpEarned} XP · {e.progressPct}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No data yet.</div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass p-4 rounded-xl">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
