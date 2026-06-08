"use client";

import { useState } from "react";
import { PanelLeft, PanelRight } from "lucide-react";
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
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  return (
    <WhiteboardProvider board={board} role={role} currentUser={currentUser}>
      <div className="fixed inset-0 flex flex-col bg-background">
        <WhiteboardTopbar />

        <div className="flex-1 flex min-h-0">
          <aside
            className={cn(
              "border-r border-border bg-card transition-all duration-200 overflow-hidden",
              leftOpen ? "w-52" : "w-0",
            )}
          >
            <PagePanel />
          </aside>

          <div className="flex-1 min-w-0 relative">
            <WhiteboardCanvas />

            <button
              onClick={() => setLeftOpen((v) => !v)}
              title="Toggle pages"
              className="absolute top-2 left-2 z-10 p-1.5 rounded-lg bg-card/80 border border-border text-muted-foreground hover:text-foreground"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setRightOpen((v) => !v)}
              title="Toggle people & layers"
              className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-card/80 border border-border text-muted-foreground hover:text-foreground"
            >
              <PanelRight className="w-4 h-4" />
            </button>
          </div>

          <aside
            className={cn(
              "border-l border-border bg-card transition-all duration-200 overflow-hidden flex flex-col",
              rightOpen ? "w-56" : "w-0",
            )}
          >
            <div className="flex-1 min-h-0">
              <CollaboratorPanel />
            </div>
            <div className="flex-1 min-h-0 border-t border-border">
              <LayerPanel />
            </div>
          </aside>
        </div>
      </div>
    </WhiteboardProvider>
  );
}
