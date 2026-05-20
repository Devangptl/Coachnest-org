"use client";

import { BookOpen, Users, Calendar, Video } from "lucide-react";

export default function OverviewTab({ cls }: { cls: any }) {
  return (
    <div className="space-y-4">
      {cls.description && (
        <div className="glass p-5 rounded-xl">
          <h2 className="font-semibold mb-2">About this class</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{cls.description}</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Users} label="Students" value={cls._count.enrollments} color="emerald" />
        <Stat icon={BookOpen} label="Courses" value={cls.courses.length} color="amber" />
        <Stat icon={Video} label="Live sessions" value={cls._count.liveSessions} color="violet" />
        <Stat icon={Calendar} label="Starts" value={cls.startDate ? new Date(cls.startDate).toLocaleDateString() : "TBD"} color="sky" />
      </div>

      <div className="glass p-5 rounded-xl">
        <h2 className="font-semibold mb-3">Quick info</h2>
        <dl className="grid sm:grid-cols-2 gap-3 text-sm">
          <Row label="Status" value={cls.status} />
          <Row label="Visibility" value={cls.visibility} />
          <Row label="Join mode" value={cls.joinMode.replace("_", " ")} />
          <Row label="Max students" value={cls.maxStudents ?? "Unlimited"} />
          <Row label="Chat" value={cls.enableChat ? "On" : "Off"} />
          <Row label="Live classes" value={cls.enableLiveClass ? "On" : "Off"} />
          <Row label="Attendance" value={cls.enableAttendance ? "On" : "Off"} />
          <Row label="Certificate" value={cls.enableCertificate ? "On" : "Off"} />
        </dl>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon, label, value, color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  color: "amber" | "emerald" | "violet" | "sky";
}) {
  const colors = {
    amber: "text-amber-400 bg-amber-500/10",
    emerald: "text-emerald-400 bg-emerald-500/10",
    violet: "text-violet-400 bg-violet-500/10",
    sky: "text-sky-400 bg-sky-500/10",
  };
  return (
    <div className="glass p-4 rounded-xl">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${colors[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{String(value)}</dd>
    </div>
  );
}
