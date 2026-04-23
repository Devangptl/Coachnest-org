"use client";

import GlassCard from "@/components/GlassCard";
import { Mail, Calendar, BookOpen, Users, DollarSign } from "lucide-react";

interface InstructorAccountInfoProps {
  email: string;
  createdAt: string;
  stats: {
    courses: number;
    students: number;
    totalEarned: number;
  };
}

export default function InstructorAccountInfo({
  email,
  createdAt,
  stats,
}: InstructorAccountInfoProps) {
  const joinDate = new Date(createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <GlassCard>
      <h2 className="text-lg font-semibold text-foreground mb-4">Account Overview</h2>

      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        <div className="flex items-center gap-3 text-muted-foreground text-sm">
          <Mail className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>{email}</span>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground text-sm">
          <Calendar className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>Joined {joinDate}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Courses", value: stats.courses, icon: BookOpen, color: "text-amber-400" },
          { label: "Students", value: stats.students, icon: Users, color: "text-emerald-400" },
          {
            label: "Earned",
            value: `$${stats.totalEarned.toFixed(2)}`,
            icon: DollarSign,
            color: "text-blue-400",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-secondary border border-border rounded-md p-3 text-center"
            >
              <Icon className={`w-4 h-4 ${stat.color} mx-auto mb-1`} />
              <div className="text-xl font-bold text-foreground">{stat.value}</div>
              <div className="text-muted-foreground/70 text-xs">{stat.label}</div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
