"use client";

import GlassCard from "@/components/GlassCard";
import { Calendar, BookOpen, Award, Star } from "lucide-react";

interface AccountInfoProps {
  name: string;
  avatar: string;
  email: string;
  createdAt: string;
  stats: {
    enrollments: number;
    certificates: number;
    reviews: number;
  };
}

export default function AccountInfo({ name, avatar, email, createdAt, stats }: AccountInfoProps) {
  const joinDate = new Date(createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <GlassCard>
      {/* Profile identity header */}
      <div className="flex items-center gap-3 pb-4 mb-4 border-b border-border">
        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-border bg-secondary flex-shrink-0">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-foreground/60 text-lg font-bold select-none">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground text-sm truncate">{name}</p>
          <p className="text-xs text-muted-foreground truncate">{email}</p>
        </div>
      </div>

      {/* Join date */}
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-4">
        <Calendar className="w-3.5 h-3.5 text-[#d97757] flex-shrink-0" />
        <span>Joined {joinDate}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Enrolled", value: stats.enrollments, icon: BookOpen, color: "text-[#d97757]" },
          { label: "Certs",    value: stats.certificates, icon: Award,    color: "text-emerald-400" },
          { label: "Reviews",  value: stats.reviews,      icon: Star,     color: "text-yellow-400" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-secondary border border-border rounded-md p-2.5 text-center"
            >
              <Icon className={`w-3.5 h-3.5 ${stat.color} mx-auto mb-1`} />
              <div className="text-sm sm:text-base font-bold text-foreground">{stat.value}</div>
              <div className="text-muted-foreground/70 text-[10px]">{stat.label}</div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
