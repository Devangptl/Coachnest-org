"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { BookOpen, ListChecks, Star, MessageSquare } from "lucide-react";

interface Tab {
  id: string;
  label: string;
  icon: React.ElementType;
}

const TABS: Tab[] = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "curriculum", label: "Curriculum", icon: ListChecks },
  { id: "reviews", label: "Reviews", icon: MessageSquare },
];

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
  reviewCount?: number;
  lessonCount?: number;
}

export default function CourseTabs({ activeTab, onTabChange, reviewCount, lessonCount }: Props) {
  return (
    <div className="flex items-center gap-1 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-1.5">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        const count =
          tab.id === "reviews" ? reviewCount :
          tab.id === "curriculum" ? lessonCount :
          undefined;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
              isActive ? "text-white" : "text-white/50 hover:text-white/70"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="course-tab"
                className="absolute inset-0 bg-white/10 border border-white/15 rounded-xl"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <span className="relative flex items-center gap-2">
              <Icon className="w-4 h-4" />
              {tab.label}
              {count !== undefined && count > 0 && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full",
                  isActive ? "bg-purple-500/30 text-purple-300" : "bg-white/10 text-white/40"
                )}>
                  {count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
