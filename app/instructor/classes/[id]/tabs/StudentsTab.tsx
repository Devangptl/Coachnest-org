"use client";

import { useEffect, useState } from "react";
import { Check, X, Ban, UserMinus, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";

type Enrollment = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "BANNED" | "WAITLISTED";
  user: { id: string; name: string; email: string; avatar: string | null };
  requestedAt: string;
  progressPct: number;
  attendStreak: number;
};

export default function StudentsTab({ classId }: { classId: string }) {
  const [tab, setTab] = useState<"APPROVED" | "PENDING" | "BANNED">("APPROVED");
  const [items, setItems] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/classes/${classId}/enrollments?status=${tab}`);
      const data = await res.json();
      setItems(data.enrollments ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [tab]); // eslint-disable-line

  async function decide(enrollmentId: string, decision: "APPROVE" | "REJECT" | "BAN" | "REMOVE") {
    try {
      const res = await fetch(`/api/classes/${classId}/enrollments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId, decision }),
      });
      if (!res.ok) throw new Error();
      toast.success("Updated");
      // Optimistic remove
      setItems((prev) => prev.filter((e) => e.id !== enrollmentId));
    } catch {
      toast.error("Failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(["APPROVED", "PENDING", "BANNED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              tab === s
                ? "bg-amber-500/15 text-amber-400 border border-amber-400/30"
                : "bg-secondary text-muted-foreground border border-transparent"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
        </div>
      ) : items.length === 0 ? (
        <div className="glass p-10 rounded-xl text-center text-sm text-muted-foreground">
          No {tab.toLowerCase()} students.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((e) => (
            <div key={e.id} className="glass p-3 rounded-lg flex items-center gap-3">
              {e.user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                  {e.user.name?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{e.user.name}</div>
                <div className="text-xs text-muted-foreground truncate">{e.user.email}</div>
              </div>
              {tab === "APPROVED" && (
                <>
                  <div className="text-xs text-muted-foreground hidden sm:block">
                    {e.progressPct}% · streak {e.attendStreak}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => decide(e.id, "REMOVE")}>
                    <UserMinus className="w-4 h-4" /> Remove
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => decide(e.id, "BAN")}>
                    <Ban className="w-4 h-4" /> Ban
                  </Button>
                </>
              )}
              {tab === "PENDING" && (
                <>
                  <Button size="sm" variant="success" onClick={() => decide(e.id, "APPROVE")}>
                    <Check className="w-4 h-4" /> Approve
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => decide(e.id, "REJECT")}>
                    <X className="w-4 h-4" /> Reject
                  </Button>
                </>
              )}
              {tab === "BANNED" && (
                <Button size="sm" variant="success" onClick={() => decide(e.id, "APPROVE")}>
                  Unban
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
