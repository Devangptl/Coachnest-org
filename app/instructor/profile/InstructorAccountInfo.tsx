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
      <h2 className="text-base sm:text-lg font-semibold text-foreground mb-4">Account Overview</h2>

      <div className="space-y-2.5 mb-5">
        <div className="flex items-center gap-2.5 text-muted-foreground text-sm min-w-0">
          <Mail className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span className="truncate">{email}</span>
        </div>
        <div className="flex items-center gap-2.5 text-muted-foreground text-sm">
          <Calendar className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>Joined {joinDate}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: "Courses", value: stats.courses, icon: BookOpen, color: "text-amber-400" },
          { label: "Students", value: stats.students, icon: Users, color: "text-emerald-400" },
          {
            label: "Earned",
            value: `₹${stats.totalEarned.toLocaleString("en-IN")}`,
            icon: DollarSign,
            color: "text-blue-400",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-secondary border border-border rounded-md p-2.5 sm:p-3 text-center"
            >
              <Icon className={`w-4 h-4 ${stat.color} mx-auto mb-1`} />
              <div className="text-base sm:text-xl font-bold text-foreground truncate">{stat.value}</div>
              <div className="text-muted-foreground/70 text-[10px] sm:text-xs">{stat.label}</div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
