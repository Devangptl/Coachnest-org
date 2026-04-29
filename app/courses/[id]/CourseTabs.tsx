"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { BookOpen, ListChecks, MessageSquare } from "lucide-react";

const TABS = [
  { id: "overview",   label: "Overview",   icon: BookOpen,      countKey: null },
  { id: "curriculum", label: "Curriculum", icon: ListChecks,    countKey: "curriculum" },
  { id: "reviews",    label: "Reviews",    icon: MessageSquare, countKey: "reviews" },
] as const;

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
  reviewCount?: number;
  lessonCount?: number;
}

export default function CourseTabs({ activeTab, onTabChange, reviewCount, lessonCount }: Props) {
  return (
    <div className="flex items-center border border-border rounded-md bg-secondary p-1 gap-0.5">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        const count =
          tab.countKey === "reviews"    ? reviewCount :
          tab.countKey === "curriculum" ? lessonCount :
          undefined;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative flex-1 flex items-center justify-center gap-1.5 rounded py-2 font-medium transition-colors select-none min-h-[40px]",
              "px-1.5 sm:px-3",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="course-tab-indicator"
                className="absolute inset-0 rounded bg-background border border-border shadow-sm"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-[1] flex items-center gap-1 sm:gap-1.5 min-w-0">
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-[11px] sm:text-[13px] font-semibold leading-none truncate">
                {tab.label}
              </span>
              {count !== undefined && count > 0 && (
                <span className={cn(
                  "hidden sm:inline-flex text-[10px] min-w-[18px] items-center justify-center px-1 py-0.5 rounded-full font-bold leading-none",
                  isActive
                    ? "bg-orange-500/15 text-orange-500"
                    : "bg-border text-muted-foreground/70"
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
