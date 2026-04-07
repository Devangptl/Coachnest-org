"use client";

import { cn } from "@/lib/utils";

interface Props {
  streak: number;
  longestStreak: number;
  compact?: boolean;
}

export default function StreakCounter({ streak, longestStreak, compact = false }: Props) {
  const isActive = streak > 0;

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-sm font-semibold",
        isActive
          ? "bg-orange-500/10 border-orange-500/20 text-orange-400"
          : "bg-secondary border-border text-muted-foreground"
      )}>
        <span>{isActive ? "🔥" : "❄️"}</span>
        <span>{streak}</span>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-md p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
            Daily Streak
          </p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-white">{streak}</span>
            <span className="text-lg mb-1">{isActive ? "🔥" : "❄️"}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {streak === 0
              ? "Start learning today to begin your streak!"
              : streak === 1
              ? "1 day — keep it going!"
              : `${streak} days in a row`}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
            Best
          </p>
          <p className="text-2xl font-bold text-white">{longestStreak}</p>
          <p className="text-xs text-muted-foreground">days</p>
        </div>
      </div>

      {/* Streak milestone dots */}
      <div className="flex items-center gap-1.5 mt-4">
        {[3, 7, 14, 30, 60, 100].map((milestone) => (
          <div
            key={milestone}
            title={`${milestone}-day streak`}
            className={cn(
              "flex-1 h-1.5 rounded-full transition-colors",
              streak >= milestone ? "bg-orange-500" : "bg-secondary"
            )}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1 px-0.5">
        {[3, 7, 14, 30, 60, 100].map((m) => (
          <span key={m} className="text-[9px] text-muted-foreground/50">{m}</span>
        ))}
      </div>
    </div>
  );
}
