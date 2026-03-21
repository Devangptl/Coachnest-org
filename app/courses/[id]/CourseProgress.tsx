"use client";

import { motion } from "framer-motion";
import { Trophy, Flame } from "lucide-react";

interface Props {
  completedCount: number;
  totalCount: number;
}

export default function CourseProgress({ completedCount, totalCount }: Props) {
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {percent === 100 ? (
            <Trophy className="w-5 h-5 text-amber-400" />
          ) : (
            <Flame className="w-5 h-5 text-orange-400" />
          )}
          <span className="text-white font-semibold text-sm">Your Progress</span>
        </div>
        <span className="text-white/70 text-sm font-medium">
          {completedCount}/{totalCount} lessons
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full ${
            percent === 100
              ? "bg-gradient-to-r from-amber-400 to-yellow-500"
              : "bg-gradient-to-r from-violet-500 to-purple-500"
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
        />
        {/* Shimmer */}
        {percent > 0 && percent < 100 && (
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
            style={{ width: `${percent}%` }}
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 1.5 }}
          />
        )}
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-white/40 text-xs">
          {percent === 100
            ? "Course completed! Great job!"
            : percent > 0
            ? "Keep going, you're doing great!"
            : "Start learning to track your progress"}
        </span>
        <span className={`text-sm font-bold ${
          percent === 100 ? "text-amber-400" : "text-purple-400"
        }`}>
          {percent}%
        </span>
      </div>
    </div>
  );
}
