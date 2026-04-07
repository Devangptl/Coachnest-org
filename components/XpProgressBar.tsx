"use client";

import { cn } from "@/lib/utils";

interface Props {
  xp: number;
  level: number;
  levelLabel: string;
  levelColor: string;
  nextLevelProgress: { current: number; required: number; progress: number };
  compact?: boolean;
}

export default function XpProgressBar({
  xp,
  level,
  levelLabel,
  levelColor,
  nextLevelProgress,
  compact = false,
}: Props) {
  const isMaxLevel = nextLevelProgress.required === 0;

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-orange-400">Lv.{level}</span>
          <span className={cn("text-[10px] font-semibold", levelColor)}>{levelLabel}</span>
        </div>
        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-700"
            style={{ width: `${isMaxLevel ? 100 : nextLevelProgress.progress}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground font-medium">{xp} XP</span>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-md p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <span className="text-sm font-black text-orange-400">{level}</span>
          </div>
          <div>
            <p className={cn("text-sm font-bold leading-tight", levelColor)}>{levelLabel}</p>
            <p className="text-[11px] text-muted-foreground">Level {level}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-white">{xp.toLocaleString()}</p>
          <p className="text-[11px] text-muted-foreground">Total XP</p>
        </div>
      </div>

      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full transition-all duration-700"
          style={{ width: `${isMaxLevel ? 100 : nextLevelProgress.progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between mt-2">
        {isMaxLevel ? (
          <span className="text-xs text-orange-400 font-medium">Max Level Reached!</span>
        ) : (
          <>
            <span className="text-[11px] text-muted-foreground">
              {nextLevelProgress.current.toLocaleString()} / {nextLevelProgress.required.toLocaleString()} XP to Level {level + 1}
            </span>
            <span className="text-[11px] text-muted-foreground">{nextLevelProgress.progress}%</span>
          </>
        )}
      </div>
    </div>
  );
}
