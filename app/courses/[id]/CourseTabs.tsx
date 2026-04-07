"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { BookOpen, ListChecks, MessageSquare } from "lucide-react";

interface Tab {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  activeBg: string;
  activeText: string;
  activeBorder: string;
  glowColor: string;
}

const TABS: Tab[] = [
  {
    id: "overview",
    label: "Overview",
    icon: BookOpen,
    color: "text-blue-600 dark:text-blue-400",
    activeBg: "bg-blue-500/10 ",
    activeText: "text-blue-700 dark:text-blue-300",
    activeBorder: "border-blue-500/20 dark:border-blue-400/30",
    glowColor: "shadow-blue-500/10",
  },
  {
    id: "curriculum",
    label: "Curriculum",
    icon: ListChecks,
    color: "text-orange-600 dark:text-orange-400",
    activeBg: "bg-orange-500/10",
    activeText: "text-orange-700 dark:text-orange-300",
    activeBorder: "border-orange-500/20 dark:border-orange-400/30",
    glowColor: "shadow-orange-500/10",
  },
  {
    id: "reviews",
    label: "Reviews",
    icon: MessageSquare,
    color: "text-amber-600 dark:text-amber-400",
    activeBg: "bg-amber-500/10",
    activeText: "text-amber-700 dark:text-amber-300",
    activeBorder: "border-amber-500/20 dark:border-amber-400/25",
    glowColor: "shadow-amber-500/10",
  },
];

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
  reviewCount?: number;
  lessonCount?: number;
}

export default function CourseTabs({ activeTab, onTabChange, reviewCount, lessonCount }: Props) {
  return (
    <div className="course-tabs-wrapper relative -mx-4 sm:-mx-6 lg:mx-0">
      {/* Frosted glass backdrop — mobile only */}
      <div className="lg:hidden absolute inset-0 bg-background/70 backdrop-blur-xl border-b border-border/40" />

      <div className="relative px-4 sm:px-6 lg:px-0 py-2.5 lg:py-0">
        <div className="flex items-center bg-secondary/50 dark:bg-white/[0.04] border border-border/50 dark:border-white/[0.08] rounded-2xl p-1.5 gap-1 shadow-sm">
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
                  "relative flex-1 flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-200 select-none",
                  // 44px+ touch targets for mobile accessibility
                  "min-h-[46px] sm:min-h-[44px] px-2.5 sm:px-4 py-2.5",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground active:scale-[0.96] active:bg-black/5 dark:active:bg-white/[0.03]"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="course-tab-indicator"
                    className={cn(
                      "absolute inset-0 rounded-md border shadow-sm dark:shadow-lg",
                      tab.activeBg,
                      tab.activeBorder,
                      tab.glowColor
                    )}
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  />
                )}
                <span className="relative z-[1] flex items-center gap-1.5 sm:gap-2">
                  <Icon
                    className={cn(
                      "w-[17px] h-[17px] sm:w-[18px] sm:h-[18px] transition-colors duration-200 flex-shrink-0",
                      isActive ? tab.color : "text-current"
                    )}
                  />
                  <span className={cn(
                    "font-semibold leading-none transition-colors duration-200",
                    "text-[12.5px] sm:text-[13px]",
                    isActive && tab.activeText
                  )}>
                    {tab.label}
                  </span>
                  {count !== undefined && count > 0 && (
                    <span className={cn(
                      "text-[9px] sm:text-[10px] min-w-[18px] sm:min-w-[20px] text-center px-1 sm:px-1.5 py-0.5 rounded-full font-bold transition-all leading-none",
                      isActive
                        ? `${tab.color} bg-black/5 dark:bg-white/[0.08]`
                        : "bg-black/5 dark:bg-white/[0.04] text-muted-foreground/70 dark:text-muted-foreground/40"
                    )}>
                      {count}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
