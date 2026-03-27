"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  isEnrolled: boolean;
  children: React.ReactNode;
  sidebar: React.ReactNode;
}

export default function CourseLayout({ isEnrolled, children, sidebar }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(!isEnrolled);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-5">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: tabbed content — expands when sidebar is hidden */}
        <div className={cn(
          "min-w-0 transition-all duration-500",
          sidebarOpen ? "flex-1" : "flex-1 lg:max-w-full"
        )}>
          {children}
        </div>

        {/* Right: sticky sidebar with toggle */}
        <div className="relative">
          {/* Toggle button — visible only on desktop for enrolled users */}
          {isEnrolled && (
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className={cn(
                "hidden lg:flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl border transition-all mb-3",
                sidebarOpen
                  ? "text-muted-foreground/70 bg-white/[0.03] border-white/[0.08] hover:text-muted-foreground hover:border-border"
                  : "text-orange-400 bg-orange-500/10 border-orange-400/20 hover:bg-orange-500/15"
              )}
            >
              {sidebarOpen ? (
                <>
                  <PanelRightClose className="w-3.5 h-3.5" />
                  Hide details
                </>
              ) : (
                <>
                  <PanelRightOpen className="w-3.5 h-3.5" />
                  Show details
                </>
              )}
            </button>
          )}

          <AnimatePresence mode="wait">
            {sidebarOpen && (
              <motion.aside
                initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                animate={{ opacity: 1, width: 320, marginLeft: 0 }}
                exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="flex-shrink-0 overflow-hidden hidden lg:block"
              >
                <div className="w-[320px] sticky top-20">
                  {sidebar}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Always show sidebar on mobile (no toggle) */}
          <div className="lg:hidden">
            {sidebar}
          </div>
        </div>
      </div>
    </div>
  );
}
