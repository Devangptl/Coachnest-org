"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Highlighter, Trash2, X, Palette, StickyNote, Copy, Check } from "lucide-react";
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
  { value: "#f59e0b", label: "Amber",  bg: "bg-amber-500",  ring: "ring-amber-400"  },
  { value: "#10b981", label: "Emerald",bg: "bg-emerald-500",ring: "ring-emerald-400"},
  { value: "#3b82f6", label: "Blue",   bg: "bg-blue-500",   ring: "ring-blue-400"   },
  { value: "#ef4444", label: "Red",    bg: "bg-red-500",    ring: "ring-red-400"    },
];

const POPUP_WIDTH   = 260;
const TOOLTIP_WIDTH = 310;

// ── Main component ────────────────────────────────────────────────────────────

export default function TextHighlighter({ lessonId, isEnrolled, children }: TextHighlighterProps) {
  const [highlights, setHighlights] = useState<HighlightData[]>([]);
  const [popup, setPopup] = useState<{
    x: number; y: number;
    text: string; blockIndex: number;
    startOffset: number; endOffset: number;
  } | null>(null);
  const [selectedColor, setSelectedColor] = useState(COLORS[0].value);
  const [saving, setSaving] = useState(false);
  const [activeHighlight, setActiveHighlight] = useState<HighlightData | null>(null);
  const [activeHlPos, setActiveHlPos]   = useState<{ x: number; y: number } | null>(null);
  const [noteEditing, setNoteEditing]   = useState(false);
  const [noteDraft, setNoteDraft]       = useState("");
  const [noteSaving, setNoteSaving]     = useState(false);
  const [copied, setCopied]             = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Fetch existing highlights ────────────────────────────────────────────
  useEffect(() => {
    if (!isEnrolled) return;
    let cancelled = false;
    fetch(`/api/highlights?lessonId=${lessonId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => { if (!cancelled) setHighlights(data.highlights || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [lessonId, isEnrolled]);

  // ── Clamp x to container's visible width ─────────────────────────────────
  function clampX(containerRelativeX: number, width: number) {
    const container = containerRef.current;
    if (!container) return containerRelativeX;
    const rect = container.getBoundingClientRect();
    const half = width / 2;
    const min  = half + 8;
    const max  = rect.width - half - 8;
    if (max <= min) return rect.width / 2;
    return Math.max(min, Math.min(max, containerRelativeX));
  }

  // ── Handle text selection ────────────────────────────────────────────────
  const handleMouseUp = useCallback(() => {
    if (!isEnrolled) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return;

    const text = selection.toString().trim();
    if (!text || text.length < 2) return;

    const range     = selection.getRangeAt(0);
    const container = containerRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) return;

    // Don't trigger when selection is entirely inside an existing highlight
    let probe: Node | null = range.commonAncestorContainer;
    while (probe && probe !== container) {
      if (probe.nodeType === Node.ELEMENT_NODE) {
        const el = probe as HTMLElement;
        if (el.dataset?.highlightId) return;
      }
      probe = probe.parentNode;
    }

    // Find the nearest block element with data-block-index
    let blockEl = range.startContainer as HTMLElement;
    if (blockEl.nodeType === Node.TEXT_NODE) blockEl = blockEl.parentElement!;
    while (blockEl && !blockEl.dataset?.blockIndex && blockEl !== container) {
      blockEl = blockEl.parentElement!;
    }
    if (!blockEl || !blockEl.dataset?.blockIndex) return;

    const blockIndex = parseInt(blockEl.dataset.blockIndex, 10);
    const rangeStart = getTextOffset(blockEl, range.startContainer, range.startOffset);
    const rangeEnd   = getTextOffset(blockEl, range.endContainer,   range.endOffset);
    if (rangeStart === rangeEnd) return;

    const rect          = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    setPopup({
      x: clampX(rect.left + rect.width / 2 - containerRect.left, POPUP_WIDTH),
      y: rect.top - containerRect.top - 10,
      text,
      blockIndex,
      startOffset: Math.min(rangeStart, rangeEnd),
      endOffset:   Math.max(rangeStart, rangeEnd),
    });
    setActiveHighlight(null);
    setActiveHlPos(null);
  }, [isEnrolled]);

  // ── Close popups on outside click ────────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (
        !target.closest("[data-highlight-popup]") &&
        !target.closest("[data-highlight-tooltip]")
      ) {
        closeAllPopups();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Close popups on Escape ───────────────────────────────────────────────
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeAllPopups();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  function closeAllPopups() {
    setPopup(null);
    setActiveHighlight(null);
    setActiveHlPos(null);
    setNoteEditing(false);
    setNoteDraft("");
    setCopied(false);
  }

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
          text:        popup.text,
          blockIndex:  popup.blockIndex,
          startOffset: popup.startOffset,
          endOffset:   popup.endOffset,
          color:       selectedColor,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const { highlight } = await res.json();
      setHighlights((prev) => [...prev, highlight]);
      toast.success("Text highlighted");
      setPopup(null);
      window.getSelection()?.removeAllRanges();
    } catch {
      toast.error("Failed to save highlight");
    } finally {
      setSaving(false);
    }
  }

  // Ref so the keyboard handler always calls the latest saveHighlight
  const saveHighlightRef = useRef(saveHighlight);
  saveHighlightRef.current = saveHighlight;

  // ── Keyboard shortcuts when selection popup is open ──────────────────────
  // Press 1–5 to pick a color; Enter to apply the highlight.
  useEffect(() => {
    if (!popup) return;
    function onPopupKey(e: KeyboardEvent) {
      if (e.key === "Escape") return; // handled by the existing listener
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < COLORS.length) {
        e.preventDefault();
        setSelectedColor(COLORS[idx].value);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        saveHighlightRef.current();
      }
    }
    document.addEventListener("keydown", onPopupKey);
    return () => document.removeEventListener("keydown", onPopupKey);
  }, [popup]);

  // ── Update a highlight (color or note) ───────────────────────────────────
  async function updateHighlight(id: string, patch: { color?: string; note?: string | null }) {
    // Optimistic update
    setHighlights((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)));
    setActiveHighlight((prev) => (prev?.id === id ? { ...prev, ...patch } : prev));

    try {
      const res = await fetch(`/api/highlights/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
      const { highlight } = await res.json();
      setHighlights((prev) => prev.map((h) => (h.id === id ? highlight : h)));
      setActiveHighlight((prev) => (prev?.id === id ? highlight : prev));
    } catch {
      toast.error("Failed to update highlight");
    }
  }

  // ── Remove a highlight ───────────────────────────────────────────────────
  async function removeHighlight(id: string) {
    try {
      const res = await fetch(`/api/highlights/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setHighlights((prev) => prev.filter((h) => h.id !== id));
      closeAllPopups();
      toast.success("Highlight removed");
    } catch {
      toast.error("Failed to remove highlight");
    }
  }

  async function copyHighlightText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Failed to copy");
    }
  }

  async function saveNote() {
    if (!activeHighlight || noteSaving) return;
    setNoteSaving(true);
    const next = noteDraft.trim() ? noteDraft.trim() : null;
    await updateHighlight(activeHighlight.id, { note: next });
    setNoteSaving(false);
    setNoteEditing(false);
    toast.success(next ? "Note saved" : "Note removed");
  }

  // ── Handle highlight click ───────────────────────────────────────────────
  // Ref so HighlightedContent doesn't re-render/rebuild marks on every parent render.
  const handleHighlightClickRef = useRef<(e: MouseEvent, hl: HighlightData) => void>(() => {});
  handleHighlightClickRef.current = (e: MouseEvent, highlight: HighlightData) => {
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;
    const rect          = (e.target as HTMLElement).getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const fresh = highlights.find((h) => h.id === highlight.id) || highlight;
    setActiveHighlight(fresh);
    setNoteDraft(fresh.note || "");
    setNoteEditing(false);
    setCopied(false);
    setActiveHlPos({
      x: clampX(rect.left + rect.width / 2 - containerRect.left, TOOLTIP_WIDTH),
      y: rect.top - containerRect.top - 10,
    });
    setPopup(null);
  };

  const stableOnHighlightClick = useCallback((e: MouseEvent, hl: HighlightData) => {
    handleHighlightClickRef.current(e, hl);
  }, []);

  const activeColor  = activeHighlight?.color || COLORS[0].value;
  const activeHasNote = useMemo(
    () => !!(activeHighlight?.note?.trim()),
    [activeHighlight]
  );

  if (!isEnrolled) {
    return <>{children}</>;
  }

  return (
    <div ref={containerRef} className="relative select-text" onMouseUp={handleMouseUp}>
      <HighlightedContent highlights={highlights} onHighlightClick={stableOnHighlightClick}>
        {children}
      </HighlightedContent>

      {/* ── Highlight count footer ──────────────────────────────────────── */}
      {highlights.length > 0 && (
        <div className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground/40 select-none pointer-events-none border-t border-border/30 pt-3">
          <Highlighter className="w-3 h-3" />
          <span>
            {highlights.length} {highlights.length === 1 ? "highlight" : "highlights"} saved in this lesson
          </span>
        </div>
      )}

      {/* ── Selection popup ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {popup && (
          <motion.div
            data-highlight-popup
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 flex flex-col items-center"
            style={{
              left:      `${popup.x}px`,
              top:       `${popup.y}px`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="bg-popover/60 backdrop-blur-md border border-border/60 rounded-xl p-3 flex flex-col gap-2.5 min-w-[240px] max-w-[300px]">
              {/* Selected text preview */}
              <p className="text-[11px] text-muted-foreground/60 italic leading-relaxed line-clamp-2 border-b border-border/60 pb-2.5 select-none">
                &ldquo;{popup.text.length > 90 ? popup.text.slice(0, 90) + "…" : popup.text}&rdquo;
              </p>

              {/* Color palette with keyboard number hints */}
              <div className="flex items-center gap-2 px-0.5">
                <Palette className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                <div className="flex items-center gap-2.5">
                  {COLORS.map((c, i) => (
                    <div key={c.value} className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => setSelectedColor(c.value)}
                        className={cn(
                          "w-5 h-5 rounded-full transition-all",
                          c.bg,
                          selectedColor === c.value
                            ? `ring-2 ${c.ring} ring-offset-1 ring-offset-popover scale-110`
                            : "opacity-55 hover:opacity-90 hover:scale-105"
                        )}
                        title={`${c.label} (${i + 1})`}
                        aria-label={`${c.label} highlight color`}
                      />
                      <span className="text-[9px] text-muted-foreground/30 leading-none select-none">{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Highlight button */}
              <button
                onClick={saveHighlight}
                disabled={saving}
                className="flex items-center justify-center gap-2 text-sm px-3 py-2 rounded-lg bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 hover:border-primary/50 transition-all font-semibold disabled:opacity-50"
              >
                <Highlighter className="w-3.5 h-3.5" />
                {saving ? "Saving…" : "Highlight"}
              </button>

              {/* Keyboard hint */}
              <p className="text-[10px] text-muted-foreground/30 text-center -mt-0.5 select-none">
                1–5 to pick color · Enter to apply
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Active highlight tooltip ─────────────────────────────────────── */}
      <AnimatePresence>
        {activeHighlight && activeHlPos && (
          <motion.div
            data-highlight-tooltip
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 flex flex-col items-center"
            style={{
              left:      `${activeHlPos.x}px`,
              top:       `${activeHlPos.y}px`,
              transform: "translate(-50%, -100%)",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="bg-popover/60 backdrop-blur-md border border-border/60 rounded-xl p-3 flex flex-col gap-2.5 w-[300px]">
              {/* Highlighted text snippet */}
              <p className="text-[11px] text-muted-foreground/60 italic leading-relaxed line-clamp-2 border-b border-border/60 pb-2.5 select-none">
                &ldquo;{activeHighlight.text.length > 90
                  ? activeHighlight.text.slice(0, 90) + "…"
                  : activeHighlight.text}&rdquo;
              </p>

              {/* Color switcher */}
              <div className="flex items-center gap-2 px-0.5">
                <Palette className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                <div className="flex items-center gap-2.5">
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => updateHighlight(activeHighlight.id, { color: c.value })}
                      className={cn(
                        "w-5 h-5 rounded-full transition-all",
                        c.bg,
                        activeColor === c.value
                          ? `ring-2 ${c.ring} ring-offset-1 ring-offset-popover scale-110`
                          : "opacity-55 hover:opacity-90 hover:scale-105"
                      )}
                      title={c.label}
                      aria-label={`Change to ${c.label}`}
                    />
                  ))}
                </div>
              </div>

              {/* Action row */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setNoteEditing((v) => !v);
                    setNoteDraft(activeHighlight.note || "");
                  }}
                  className={cn(
                    "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all font-medium flex-1 justify-center",
                    activeHasNote
                      ? "bg-primary/15 border-primary/30 text-primary hover:bg-primary/25"
                      : "bg-secondary border-border text-foreground/70 hover:text-foreground hover:bg-accent"
                  )}
                  title={activeHasNote ? "Edit note" : "Add note"}
                >
                  <StickyNote className="w-3 h-3" />
                  {activeHasNote ? "Note" : "Add note"}
                </button>
                <button
                  onClick={() => copyHighlightText(activeHighlight.text)}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-secondary border border-border text-foreground/70 hover:text-foreground hover:bg-accent transition-all font-medium"
                  title="Copy highlighted text"
                >
                  {copied
                    ? <Check className="w-3 h-3 text-emerald-400" />
                    : <Copy className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => removeHighlight(activeHighlight.id)}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive hover:bg-destructive/25 transition-all font-medium"
                  title="Remove highlight"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                <button
                  onClick={closeAllPopups}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                  title="Close"
                  aria-label="Close"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* Note editor / preview */}
              <AnimatePresence initial={false} mode="wait">
                {noteEditing ? (
                  <motion.div
                    key="editor"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-2 pt-1 border-t border-border">
                      <textarea
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            saveNote();
                          }
                        }}
                        autoFocus
                        placeholder="Write a note…"
                        className="w-full text-xs bg-input border border-border rounded-md p-2 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                        rows={3}
                        maxLength={500}
                      />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground/50">
                          {noteDraft.length}/500 · ⌘↵ to save
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setNoteEditing(false);
                              setNoteDraft(activeHighlight.note || "");
                            }}
                            className="text-xs px-2.5 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={saveNote}
                            disabled={noteSaving}
                            className="text-xs px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-medium disabled:opacity-50"
                          >
                            {noteSaving ? "Saving…" : "Save"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : activeHasNote ? (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-1 border-t border-border">
                      <p className="text-xs text-foreground/80 whitespace-pre-wrap break-words px-1 py-1">
                        {activeHighlight.note}
                      </p>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Utility: character offset within a block element ──────────────────────────

function getTextOffset(container: Node, targetNode: Node, targetOffset: number): number {
  let offset = 0;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node === targetNode) return offset + targetOffset;
    offset += node.textContent?.length || 0;
  }
  return offset;
}

// ── Highlighted content renderer ──────────────────────────────────────────────

interface HighlightedContentProps {
  highlights: HighlightData[];
  onHighlightClick: (e: MouseEvent, highlight: HighlightData) => void;
  children: React.ReactNode;
}

function HighlightedContent({ highlights, onHighlightClick, children }: HighlightedContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current) return;

    // Clear existing highlight wrappers
    contentRef.current.querySelectorAll("[data-highlight-id]").forEach((el) => {
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
        parent.normalize();
      }
    });

    highlights.forEach((hl) => {
      const blockEl = contentRef.current?.querySelector(`[data-block-index="${hl.blockIndex}"]`);
      if (!blockEl) return;
      applyHighlightToBlock(blockEl, hl, onHighlightClick);
    });
  }, [highlights, onHighlightClick]);

  return <div ref={contentRef}>{children}</div>;
}

// ── Apply a single highlight to a block element ───────────────────────────────

function applyHighlightToBlock(
  blockEl: Element,
  hl: HighlightData,
  onClick: (e: MouseEvent, highlight: HighlightData) => void
) {
  const walker = document.createTreeWalker(blockEl, NodeFilter.SHOW_TEXT);
  let currentOffset   = 0;
  let startNode: Text | null = null;
  let endNode:   Text | null = null;
  let startOffsetInNode = 0;
  let endOffsetInNode   = 0;

  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as Text;
    const nodeLen  = textNode.length;

    if (!startNode && currentOffset + nodeLen > hl.startOffset) {
      startNode         = textNode;
      startOffsetInNode = hl.startOffset - currentOffset;
    }
    if (!endNode && currentOffset + nodeLen >= hl.endOffset) {
      endNode         = textNode;
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

    const hasNote = !!(hl.note?.trim());

    Object.assign(mark.style, {
      backgroundColor: `${hl.color}30`,
      borderBottom:    `2px solid ${hl.color}bb`,
      borderRadius:    "3px",
      padding:         "1px 1px",
      cursor:          "pointer",
      color:           "inherit",
      transition:      "background-color 0.15s ease, box-shadow 0.15s ease",
      position:        "relative",
      boxShadow:       hasNote ? `inset 3px 0 0 0 ${hl.color}` : "",
      paddingLeft:     hasNote ? "4px" : "1px",
    });
    mark.title = hasNote ? hl.note!.trim() : "Click to edit highlight";

    mark.addEventListener("mouseenter", () => {
      mark.style.backgroundColor = `${hl.color}55`;
      mark.style.boxShadow = hasNote
        ? `inset 3px 0 0 0 ${hl.color}, 0 1px 5px ${hl.color}44`
        : `0 1px 5px ${hl.color}44`;
    });
    mark.addEventListener("mouseleave", () => {
      mark.style.backgroundColor = `${hl.color}30`;
      mark.style.boxShadow = hasNote ? `inset 3px 0 0 0 ${hl.color}` : "";
    });
    mark.addEventListener("click", (e) => onClick(e, hl));

    range.surroundContents(mark);
  } catch {
    // surroundContents fails when the range crosses element boundaries; skip silently.
  }
}
