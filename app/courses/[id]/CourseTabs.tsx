"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { BookOpen, ListChecks, MessageSquare } from "lucide-react";

interface Tab {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  activeColor: string;
}

const TABS: Tab[] = [
  { id: "overview", label: "Overview", icon: BookOpen, color: "text-blue-400", activeColor: "from-blue-500/20 to-orange-500/15 border-blue-400/25" },
  { id: "curriculum", label: "Curriculum", icon: ListChecks, color: "text-orange-400", activeColor: "from-orange-600/20 to-orange-500/15 border-orange-400/25" },
  { id: "reviews", label: "Reviews", icon: MessageSquare, color: "text-amber-400", activeColor: "from-amber-500/15 to-orange-500/15 border-amber-400/20" },
];

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
  reviewCount?: number;
  lessonCount?: number;
}

export default function CourseTabs({ activeTab, onTabChange, reviewCount, lessonCount }: Props) {
  return (
    <div className="flex items-center backdrop-blur-xl bg-white/[0.04] border border-border rounded-xl p-1">
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
              "relative flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200",
              isActive ? "text-white" : "text-muted-foreground/70 hover:text-white/65"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="course-tab-bg"
                className={cn(
                  "absolute inset-0 bg-gradient-to-r border rounded-xl",
                  tab.activeColor
                )}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative flex items-center gap-2">
              <Icon className={cn(
                "w-[18px] h-[18px] transition-all duration-200",
                isActive ? tab.color : "text-current"
              )} />
              <span className="font-semibold">{tab.label}</span>
              {count !== undefined && count > 0 && (
                <span className={cn(
                  "text-[10px] min-w-[20px] text-center px-1.5 py-0.5 rounded-full font-bold transition-all",
                  isActive
                    ? `${tab.color} bg-secondary`
                    : "bg-white/[0.06] text-white/30"
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
