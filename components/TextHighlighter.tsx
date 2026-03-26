"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Highlighter, Trash2, X, MessageSquare, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HighlightData {
  id: string;
  text: string;
  blockIndex: number;
  startOffset: number;
  endOffset: number;
  color: string;
  note?: string | null;
}

interface TextHighlighterProps {
  lessonId: string;
  isEnrolled: boolean;
  children: React.ReactNode;
}

const COLORS = [
  { value: "#a855f7", label: "Purple", bg: "bg-purple-500", ring: "ring-purple-400" },
  { value: "#f59e0b", label: "Amber", bg: "bg-amber-500", ring: "ring-amber-400" },
  { value: "#10b981", label: "Emerald", bg: "bg-emerald-500", ring: "ring-emerald-400" },
  { value: "#3b82f6", label: "Blue", bg: "bg-blue-500", ring: "ring-blue-400" },
  { value: "#ef4444", label: "Red", bg: "bg-red-500", ring: "ring-red-400" },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function TextHighlighter({ lessonId, isEnrolled, children }: TextHighlighterProps) {
  const [highlights, setHighlights] = useState<HighlightData[]>([]);
  const [popup, setPopup] = useState<{ x: number; y: number; text: string; blockIndex: number; startOffset: number; endOffset: number } | null>(null);
  const [selectedColor, setSelectedColor] = useState(COLORS[0].value);
  const [saving, setSaving] = useState(false);
  const [activeHighlight, setActiveHighlight] = useState<HighlightData | null>(null);
  const [activeHlPos, setActiveHlPos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Fetch existing highlights ────────────────────────────────────────────
  useEffect(() => {
    if (!isEnrolled) return;
    fetch(`/api/highlights?lessonId=${lessonId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setHighlights(data.highlights || []))
      .catch(() => {});
  }, [lessonId, isEnrolled]);

  // ── Handle text selection ────────────────────────────────────────────────
  const handleMouseUp = useCallback(() => {
    if (!isEnrolled) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      return;
    }

    const text = selection.toString().trim();
    if (!text || text.length < 2) return;

    const range = selection.getRangeAt(0);
    const container = containerRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) return;

    // Find the block element
    let blockEl = range.startContainer as HTMLElement;
    if (blockEl.nodeType === Node.TEXT_NODE) blockEl = blockEl.parentElement!;

    // Walk up to find [data-block-index]
    while (blockEl && !blockEl.dataset?.blockIndex && blockEl !== container) {
      blockEl = blockEl.parentElement!;
    }

    if (!blockEl || !blockEl.dataset?.blockIndex) return;

    const blockIndex = parseInt(blockEl.dataset.blockIndex, 10);

    // Calculate offsets relative to the block's text content
    const blockText = blockEl.textContent || "";
    const rangeStart = getTextOffset(blockEl, range.startContainer, range.startOffset);
    const rangeEnd = getTextOffset(blockEl, range.endContainer, range.endOffset);

    if (rangeStart === rangeEnd) return;

    // Get position for the popup
    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    setPopup({
      x: rect.left + rect.width / 2 - containerRect.left,
      y: rect.top - containerRect.top - 10,
      text,
      blockIndex,
      startOffset: Math.min(rangeStart, rangeEnd),
      endOffset: Math.max(rangeStart, rangeEnd),
    });
  }, [isEnrolled]);

  // ── Close popups on outside click ────────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-highlight-popup]") && !target.closest("[data-highlight-tooltip]")) {
        setPopup(null);
        setActiveHighlight(null);
        setActiveHlPos(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Save a highlight ─────────────────────────────────────────────────────
  async function saveHighlight() {
    if (!popup || saving) return;
    setSaving(true);

    try {
      const res = await fetch("/api/highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          text: popup.text,
          blockIndex: popup.blockIndex,
          startOffset: popup.startOffset,
          endOffset: popup.endOffset,
          color: selectedColor,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      const { highlight } = await res.json();
      setHighlights((prev) => [...prev, highlight]);
      toast.success("Text highlighted!");
      setPopup(null);
      window.getSelection()?.removeAllRanges();
    } catch {
      toast.error("Failed to save highlight");
    } finally {
      setSaving(false);
    }
  }

  // ── Remove a highlight ───────────────────────────────────────────────────
  async function removeHighlight(id: string) {
    try {
      const res = await fetch(`/api/highlights/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setHighlights((prev) => prev.filter((h) => h.id !== id));
      setActiveHighlight(null);
      setActiveHlPos(null);
      toast.success("Highlight removed");
    } catch {
      toast.error("Failed to remove highlight");
    }
  }

  // ── Handle highlight click ───────────────────────────────────────────────
  function handleHighlightClick(e: React.MouseEvent, highlight: HighlightData) {
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    setActiveHighlight(highlight);
    setActiveHlPos({
      x: rect.left + rect.width / 2 - containerRect.left,
      y: rect.top - containerRect.top - 10,
    });
    setPopup(null);
  }

  if (!isEnrolled) {
    return <>{children}</>;
  }

  return (
    <div ref={containerRef} className="relative" onMouseUp={handleMouseUp}>
      {/* Render children with highlights applied */}
      <HighlightedContent highlights={highlights} onHighlightClick={handleHighlightClick}>
        {children}
      </HighlightedContent>

      {/* ── Selection popup ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {popup && (
          <motion.div
            data-highlight-popup
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 flex flex-col items-center"
            style={{
              left: `${popup.x}px`,
              top: `${popup.y}px`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="bg-[#1a1a2e] border border-white/15 rounded-xl shadow-2xl shadow-black/50 px-3 py-2.5 flex flex-col gap-2">
              {/* Color picker */}
              <div className="flex items-center gap-1.5 px-1">
                <Palette className="w-3 h-3 text-white/30" />
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setSelectedColor(c.value)}
                    className={cn(
                      "w-5 h-5 rounded-full transition-all",
                      c.bg,
                      selectedColor === c.value ? `ring-2 ${c.ring} ring-offset-1 ring-offset-[#1a1a2e] scale-110` : "opacity-60 hover:opacity-100"
                    )}
                    title={c.label}
                  />
                ))}
              </div>

              {/* Highlight button */}
              <button
                onClick={saveHighlight}
                disabled={saving}
                className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white/80 hover:text-white hover:bg-white/15 transition-all font-medium disabled:opacity-50"
              >
                <Highlighter className="w-3.5 h-3.5" />
                {saving ? "Saving..." : "Highlight"}
              </button>
            </div>

            {/* Arrow */}
            <div className="w-2.5 h-2.5 bg-[#1a1a2e] border-r border-b border-white/15 rotate-45 -mt-[5px]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Active highlight tooltip ───────────────────────────────────────── */}
      <AnimatePresence>
        {activeHighlight && activeHlPos && (
          <motion.div
            data-highlight-tooltip
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 flex flex-col items-center"
            style={{
              left: `${activeHlPos.x}px`,
              top: `${activeHlPos.y}px`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="bg-[#1a1a2e] border border-white/15 rounded-xl shadow-2xl shadow-black/50 px-2.5 py-2 flex items-center gap-1.5">
              <button
                onClick={() => removeHighlight(activeHighlight.id)}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-red-500/15 border border-red-400/20 text-red-400 hover:bg-red-500/25 transition-all font-medium"
              >
                <Trash2 className="w-3 h-3" />
                Remove
              </button>
              <button
                onClick={() => {
                  setActiveHighlight(null);
                  setActiveHlPos(null);
                }}
                className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="w-2.5 h-2.5 bg-[#1a1a2e] border-r border-b border-white/15 rotate-45 -mt-[5px]" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Utility: get text offset within a container ────────────────────────────

function getTextOffset(container: Node, targetNode: Node, targetOffset: number): number {
  let offset = 0;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node: Node | null;

  while ((node = walker.nextNode())) {
    if (node === targetNode) {
      return offset + targetOffset;
    }
    offset += (node.textContent?.length || 0);
  }

  return offset;
}

// ── Highlighted content renderer ──────────────────────────────────────────

interface HighlightedContentProps {
  highlights: HighlightData[];
  onHighlightClick: (e: React.MouseEvent, highlight: HighlightData) => void;
  children: React.ReactNode;
}

function HighlightedContent({ highlights, onHighlightClick, children }: HighlightedContentProps) {
  // We use a MutationObserver-free approach: apply highlights via DOM after render
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current) return;

    // Clear all existing highlights first
    contentRef.current.querySelectorAll("[data-highlight-id]").forEach((el) => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ""), el);
        parent.normalize();
      }
    });

    // Apply each highlight
    highlights.forEach((hl) => {
      const blockEl = contentRef.current?.querySelector(`[data-block-index="${hl.blockIndex}"]`);
      if (!blockEl) return;

      applyHighlightToBlock(blockEl, hl, onHighlightClick);
    });
  }, [highlights, onHighlightClick]);

  return (
    <div ref={contentRef}>
      {children}
    </div>
  );
}

// ── Apply a highlight to a specific block element ──────────────────────────

function applyHighlightToBlock(
  blockEl: Element,
  hl: HighlightData,
  onClick: (e: React.MouseEvent, highlight: HighlightData) => void
) {
  const walker = document.createTreeWalker(blockEl, NodeFilter.SHOW_TEXT);
  let currentOffset = 0;
  let startNode: Text | null = null;
  let endNode: Text | null = null;
  let startOffsetInNode = 0;
  let endOffsetInNode = 0;

  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as Text;
    const nodeLen = textNode.length;

    if (!startNode && currentOffset + nodeLen > hl.startOffset) {
      startNode = textNode;
      startOffsetInNode = hl.startOffset - currentOffset;
    }

    if (!endNode && currentOffset + nodeLen >= hl.endOffset) {
      endNode = textNode;
      endOffsetInNode = hl.endOffset - currentOffset;
      break;
    }

    currentOffset += nodeLen;
  }

  if (!startNode || !endNode) return;

  try {
    const range = document.createRange();
    range.setStart(startNode, startOffsetInNode);
    range.setEnd(endNode, endOffsetInNode);

    const mark = document.createElement("mark");
    mark.dataset.highlightId = hl.id;
    mark.style.backgroundColor = `${hl.color}30`;
    mark.style.borderBottom = `2px solid ${hl.color}60`;
    mark.style.borderRadius = "2px";
    mark.style.padding = "1px 0";
    mark.style.cursor = "pointer";
    mark.style.transition = "background-color 0.2s";

    mark.addEventListener("mouseenter", () => {
      mark.style.backgroundColor = `${hl.color}50`;
    });
    mark.addEventListener("mouseleave", () => {
      mark.style.backgroundColor = `${hl.color}30`;
    });
    mark.addEventListener("click", (e) => {
      onClick(e as unknown as React.MouseEvent, hl);
    });

    range.surroundContents(mark);
  } catch {
    // surroundContents can fail if the range crosses element boundaries
    // In that case, we skip this highlight silently
  }
}
