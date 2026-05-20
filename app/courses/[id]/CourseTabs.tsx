"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { BookMarked, GraduationCap, Star } from "lucide-react";

const TABS = [
  { id: "overview",   label: "Overview",   icon: BookMarked,     countKey: null },
  { id: "curriculum", label: "Curriculum", icon: GraduationCap,  countKey: "curriculum" },
  { id: "reviews",    label: "Reviews",    icon: Star,           countKey: "reviews" },
] as const;

interface Props {
  visible: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
  reviewCount?: number;
  lessonCount?: number;
}

export default function CourseTabs({
  visible,
  activeTab,
  onTabChange,
  reviewCount,
  lessonCount,
}: Props) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <AnimatePresence>
        {visible && (
          <motion.div
            key="course-tabs-bar"
            initial={{ y: 28, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 28, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="flex items-center bg-background/80 backdrop-blur-2xl border border-border/60 shadow-[0_8px_32px_rgba(0,0,0,0.28)] rounded-full p-1.5 gap-1 pointer-events-auto"
          >
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
                    "relative flex items-center gap-2 rounded-full px-4 sm:px-5 py-2.5 sm:py-3 font-medium transition-colors select-none",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="course-tab-indicator"
                      className="absolute inset-0 rounded-full bg-primary/15 border border-primary/70"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative z-[1] flex items-center gap-1.5 sm:gap-2">
                    <Icon className="w-[15px] h-[15px] flex-shrink-0" />
                    <span className="text-[12px] sm:text-[13px] font-semibold leading-none whitespace-nowrap">
                      {tab.label}
                    </span>
                    {count !== undefined && count > 0 && (
                      <span className={cn(
                        "hidden sm:inline-flex text-[10px] min-w-[18px] items-center justify-center px-1.5 py-0.5 rounded-full font-bold leading-none",
                        isActive
                          ? "bg-primary/20 text-primary"
                          : "bg-border text-muted-foreground/70"
                      )}>
                        {count}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
