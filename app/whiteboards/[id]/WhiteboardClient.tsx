"use client";

import { useEffect, useState } from "react";
import { WhiteboardProvider } from "@/components/whiteboard/WhiteboardProvider";
import WhiteboardTopbar from "@/components/whiteboard/WhiteboardTopbar";
import WhiteboardCanvas from "@/components/whiteboard/WhiteboardCanvas";
import PagePanel from "@/components/whiteboard/PagePanel";
import CollaboratorPanel from "@/components/whiteboard/CollaboratorPanel";
import LayerPanel from "@/components/whiteboard/LayerPanel";
import { cn } from "@/lib/utils";
import type { WhiteboardDTO, WhiteboardRole } from "@/types/whiteboard";

export default function WhiteboardClient({
  board,
  role,
  currentUser,
}: {
  board: WhiteboardDTO;
  role: WhiteboardRole;
  currentUser: { userId: string; name: string; avatar: string | null };
}) {
  // Panels are inline columns on desktop and slide-in overlays on mobile.
  // Default closed; open both on desktop after mount (avoids hydration mismatch).
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) {
      setLeftOpen(true);
      setRightOpen(true);
    }
  }, []);

  const closeOverlays = () => {
    setLeftOpen(false);
    setRightOpen(false);
  };

  return (
    <WhiteboardProvider board={board} role={role} currentUser={currentUser}>
      <div className="fixed inset-0 flex flex-col bg-background">
        <WhiteboardTopbar
          onToggleLeft={() => setLeftOpen((v) => !v)}
          onToggleRight={() => setRightOpen((v) => !v)}
        />

        <div className="flex-1 flex min-h-0 relative">
          {/* Left: pages */}
          <aside
            className={cn(
              "bg-card border-r border-border flex flex-col min-h-0 overflow-hidden",
              "absolute inset-y-0 left-0 z-30 w-60 max-w-[78%] shadow-xl transition-transform duration-200",
              leftOpen ? "translate-x-0" : "-translate-x-full",
              "md:static md:z-auto md:shadow-none md:translate-x-0 md:transition-[width]",
              leftOpen ? "md:w-52" : "md:w-0",
            )}
          >
            <PagePanel />
          </aside>

          {/* Center: canvas */}
          <div className="flex-1 min-w-0 relative">
            <WhiteboardCanvas />
          </div>

          {/* Right: people + layers */}
          <aside
            className={cn(
              "bg-card border-l border-border flex flex-col min-h-0 overflow-hidden",
              "absolute inset-y-0 right-0 z-30 w-64 max-w-[82%] shadow-xl transition-transform duration-200",
              rightOpen ? "translate-x-0" : "translate-x-full",
              "md:static md:z-auto md:shadow-none md:translate-x-0 md:transition-[width]",
              rightOpen ? "md:w-56" : "md:w-0",
            )}
          >
            <div className="flex-1 min-h-0">
              <CollaboratorPanel />
            </div>
            <div className="flex-1 min-h-0 border-t border-border">
              <LayerPanel />
            </div>
          </aside>

          {/* Mobile backdrop — tap to dismiss either drawer */}
          {(leftOpen || rightOpen) && (
            <div
              className="md:hidden absolute inset-0 z-20 bg-black/40"
              onClick={closeOverlays}
            />
          )}
        </div>
      </div>
    </WhiteboardProvider>
  );
}
