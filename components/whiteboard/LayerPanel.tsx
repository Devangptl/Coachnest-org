"use client";

import { useEffect, useState } from "react";
import { Layers, Square } from "lucide-react";
import { useWhiteboard } from "./WhiteboardProvider";
import type { SyncableElement } from "@/types/whiteboard";

/**
 * Lightweight layer list. Excalidraw owns z-order (scene array order); this
 * panel reflects it and lets you jump to an element. Polls the imperative API
 * on a slow interval rather than holding a reactive copy of the scene.
 */
export default function LayerPanel() {
  const { apiRef, activePageId } = useWhiteboard();
  const [elements, setElements] = useState<SyncableElement[]>([]);

  useEffect(() => {
    const tick = () => {
      const api = apiRef.current;
      if (!api) return;
      const live = api.getSceneElements().filter((e) => !e.isDeleted);
      setElements([...live].reverse()); // top layer first
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [apiRef, activePageId]);

  function focus(el: SyncableElement) {
    const api = apiRef.current;
    if (!api) return;
    api.updateScene({ appState: { selectedElementIds: { [el.id]: true } } });
    api.scrollToContent(el, { animate: true });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border flex items-center gap-1.5">
        <Layers className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Layers
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">{elements.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-0.5">
        {elements.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">
            Nothing drawn yet.
          </div>
        ) : (
          elements.map((el, i) => (
            <button
              key={el.id}
              onClick={() => focus(el)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            >
              <Square className="w-3 h-3 shrink-0" />
              <span className="flex-1 truncate capitalize">{el.type}</span>
              <span className="opacity-50">{elements.length - i}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
