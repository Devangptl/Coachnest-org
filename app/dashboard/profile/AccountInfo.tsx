"use client";

import GlassCard from "@/components/GlassCard";
import { Mail, Calendar, BookOpen, Award, Star } from "lucide-react";

interface AccountInfoProps {
  email: string;
  createdAt: string;
  stats: {
    enrollments: number;
    certificates: number;
    reviews: number;
  };
}

export default function AccountInfo({ email, createdAt, stats }: AccountInfoProps) {
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
          <Mail className="w-4 h-4 text-orange-400 flex-shrink-0" />
          <span>{email}</span>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground text-sm">
          <Calendar className="w-4 h-4 text-orange-400 flex-shrink-0" />
          <span>Joined {joinDate}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Enrollments", value: stats.enrollments, icon: BookOpen, color: "text-orange-400" },
          { label: "Certificates", value: stats.certificates, icon: Award, color: "text-emerald-400" },
          { label: "Reviews", value: stats.reviews, icon: Star, color: "text-yellow-400" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-secondary border border-border rounded-xl p-3 text-center"
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
