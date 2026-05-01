"use client";

import { motion } from "framer-motion";
import { Trophy, Flame, Target, Sparkles, Clock, Zap } from "lucide-react";

interface Props {
  completedCount: number;
  totalCount: number;
}

function getMessage(percent: number): string {
  if (percent === 0) return "Start your first lesson to begin tracking";
  if (percent < 25) return "Great start! Keep the momentum going";
  if (percent < 50) return "You're making excellent progress!";
  if (percent < 75) return "Over halfway — you're crushing it!";
  if (percent < 100) return "Almost done! The finish line is near";
  return "Course completed! You're a champion!";
}

function getStreakEmoji(percent: number): string {
  if (percent === 0) return "";
  if (percent < 25) return "🚀";
  if (percent < 50) return "💪";
  if (percent < 75) return "🔥";
  if (percent < 100) return "⭐";
  return "🏆";
}

export default function CourseProgress({ completedCount, totalCount }: Props) {
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const remaining = totalCount - completedCount;
  const estimatedMinutes = Math.max(0, remaining * 10);

  const bgColor =
    percent === 100
      ? "from-amber-500/8 to-yellow-500/5 border-amber-400/15"
      : percent > 0
      ? "from-orange-600/8 to-orange-500/15 border-[#d97757]/25"
      : "from-white/5 to-white/[0.02] border-border";

  const barGradient =
    percent === 100
      ? "from-amber-400 via-yellow-400 to-amber-500"
      : "from-orange-600 via-orange-500 to-[#d97757]";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`relative overflow-hidden backdrop-blur-md bg-gradient-to-r ${bgColor} border rounded-md`}
    >
      {/* Subtle background shimmer */}
      {percent > 0 && percent < 100 && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent animate-pulse" />
      )}

      <div className="relative p-4">
        {/* Top row: icon + title + stats */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.2 }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                percent === 100
                  ? "bg-amber-500/20 shadow-lg shadow-amber-500/10"
                  : percent > 0
                  ? "bg-orange-500/15 shadow-lg shadow-orange-600/15"
                  : "bg-secondary"
              }`}
            >
              {percent === 100 ? (
                <Trophy className="w-5 h-5 text-amber-400" />
              ) : percent > 50 ? (
                <Flame className="w-5 h-5 text-[#d97757]" />
              ) : percent > 0 ? (
                <Zap className="w-5 h-5 text-[#d97757]" />
              ) : (
                <Target className="w-5 h-5 text-muted-foreground/70" />
              )}
            </motion.div>
            <div>
              <h3 className="text-white font-semibold text-xs leading-tight">Your Progress</h3>
              <p className="text-white/30 text-[10px] mt-0.5">
                {completedCount} of {totalCount} lessons completed
              </p>
            </div>
          </div>

          {/* Big percentage */}
          <motion.div
            key={percent}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-right"
          >
            <span className={`text-xl font-bold tabular-nums ${
              percent === 100 ? "text-amber-400" : percent > 0 ? "text-[#d97757]" : "text-white/20"
            }`}>
              {percent}%
            </span>
          </motion.div>
        </div>

        {/* Progress bar */}
        <div className="relative h-2.5 bg-white/[0.07] rounded-full overflow-hidden mb-2">
          {/* Track glow */}
          <div className="absolute inset-0 rounded-full" style={{
            boxShadow: percent > 0 ? `inset 0 1px 2px rgba(0,0,0,0.3)` : 'none'
          }} />

          {/* Fill */}
          <motion.div
            className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${barGradient}`}
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.3 }}
          >
            {/* Inner shine */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-transparent" style={{ height: '50%' }} />
          </motion.div>

          {/* Animated shimmer */}
          {percent > 0 && percent < 100 && (
            <motion.div
              className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/15 to-transparent"
              animate={{ left: ["-33%", "100%"] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear", delay: 1.8 }}
            />
          )}

          {/* Completion sparkle */}
          {percent === 100 && (
            <motion.div
              className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Sparkles className="w-5 h-5 text-yellow-300" />
            </motion.div>
          )}
        </div>

        {/* Bottom row: message + time remaining */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground/70 text-xs flex items-center gap-1.5">
            <span>{getStreakEmoji(percent)}</span>
            {getMessage(percent)}
          </span>
          {percent > 0 && percent < 100 && estimatedMinutes > 0 && (
            <span className="text-white/25 text-[11px] flex items-center gap-1">
              <Clock className="w-3 h-3" />
              ~{estimatedMinutes >= 60 ? `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m` : `${estimatedMinutes}m`} left
            </span>
          )}
          {percent === 100 && (
            <span className="text-amber-400/70 text-[11px] font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              All lessons done!
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
