"use client";

/**
 * Rich mention input. Renders selected mentions as inline chips while you
 * type (it's a contentEditable surface, not a plain textarea) but
 * serialises to the same token format the rest of the system expects:
 *
 *   @[Display Name](userId)
 *
 * The server parses tokens for notifications; <MarkdownRenderer> renders
 * the same token as a chip in posted content. Same value contract as a
 * textarea: { value, onChange }.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AtSign, Loader2 } from "lucide-react";
import Avatar from "./Avatar";

interface UserHit {
  id: string;
  name: string;
  avatar: string | null;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  autoFocus?: boolean;
}

const TOKEN_SPLIT = /(@\[[^\]\n]+\]\([a-zA-Z0-9_-]+\))/g;
const TOKEN_ONE = /^@\[([^\]\n]+)\]\(([a-zA-Z0-9_-]+)\)$/;

function makeChip(name: string, id: string): HTMLElement {
  const span = document.createElement("span");
  span.className = "mention-chip";
  span.setAttribute("contenteditable", "false");
  span.dataset.mid = id;
  span.dataset.mname = name;
  const at = document.createElement("span");
  at.className = "at";
  at.textContent = "@";
  span.appendChild(at);
  span.appendChild(document.createTextNode(name));
  return span;
}

/** token string → editor DOM */
function renderInto(root: HTMLElement, value: string) {
  root.innerHTML = "";
  for (const part of value.split(TOKEN_SPLIT)) {
    if (!part) continue;
    const m = part.match(TOKEN_ONE);
    if (m) {
      root.appendChild(makeChip(m[1], m[2]));
    } else {
      part.split("\n").forEach((line, i) => {
        if (i > 0) root.appendChild(document.createElement("br"));
        if (line) root.appendChild(document.createTextNode(line));
      });
    }
  }
}

/** editor DOM → token string */
function serialize(root: HTMLElement): string {
  let out = "";
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.nodeValue ?? "";
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    if (el.dataset && el.dataset.mid) {
      out += `@[${el.dataset.mname}](${el.dataset.mid})`;
      return;
    }
    if (el.tagName === "BR") { out += "\n"; return; }
    const isBlock = el.tagName === "DIV" || el.tagName === "P";
    if (isBlock && out && !out.endsWith("\n")) out += "\n";
    el.childNodes.forEach(walk);
  };
  root.childNodes.forEach(walk);
  return out.replace(/\n+$/, "");
}

export default function MentionTextarea({
  value,
  onChange,
  placeholder,
  rows = 4,
  className = "",
  autoFocus,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string>("");
  // Saved trigger position (live DOM node + offsets) for chip insertion
  const trigger = useRef<{ node: Text; atIndex: number; caret: number } | null>(null);

  const [hits, setHits] = useState<UserHit[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [query, setQuery] = useState("");

  // Initialise + sync on external value changes (e.g. cleared after submit)
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (value !== lastEmitted.current) {
      renderInto(el, value);
      lastEmitted.current = value;
    }
    if (autoFocus) el.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Search effect
  useEffect(() => {
    if (!open) { setSearching(false); return; }
    setSearching(true);
    const h = setTimeout(async () => {
      try {
        const res = await fetch(`/api/community/users/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setHits(data.users || []);
        setActiveIdx(0);
      } catch {
        setHits([]);
      } finally {
        setSearching(false);
      }
    }, 180);
    return () => clearTimeout(h);
  }, [query, open]);

  const emit = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const v = serialize(el);
    lastEmitted.current = v;
    onChange(v);
  }, [onChange]);

  function detectTrigger() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.anchorNode) { setOpen(false); trigger.current = null; return; }
    const node = sel.anchorNode;
    if (node.nodeType !== Node.TEXT_NODE) { setOpen(false); trigger.current = null; return; }
    const offset = sel.anchorOffset;
    const before = (node.nodeValue ?? "").slice(0, offset);
    const m = before.match(/(?:^|\s)@([\p{L}0-9_ ]{0,30})$/u);
    if (!m) { setOpen(false); trigger.current = null; return; }
    trigger.current = { node: node as Text, atIndex: before.lastIndexOf("@"), caret: offset };
    setQuery(m[1]);
    setOpen(true);
  }

  function handleInput() {
    emit();
    // Keep placeholder working when the editor is visually empty
    const el = editorRef.current;
    if (el && serialize(el) === "" && el.innerHTML !== "") el.innerHTML = "";
    detectTrigger();
  }

  function pick(u: UserHit) {
    const el = editorRef.current;
    const t = trigger.current;
    if (!el || !t) return;
    const range = document.createRange();
    range.setStart(t.node, t.atIndex);
    range.setEnd(t.node, Math.min(t.caret, t.node.length));
    range.deleteContents();

    const chip = makeChip(u.name, u.id);
    const space = document.createTextNode(" ");
    const frag = document.createDocumentFragment();
    frag.appendChild(chip);
    frag.appendChild(space);
    range.insertNode(frag);

    // Caret after the trailing space
    const sel = window.getSelection();
    const after = document.createRange();
    after.setStartAfter(space);
    after.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(after);

    setOpen(false);
    trigger.current = null;
    el.focus();
    emit();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (open && hits.length) {
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => (i + 1) % hits.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => (i - 1 + hits.length) % hits.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(hits[activeIdx]); return; }
      if (e.key === "Escape") { e.preventDefault(); setOpen(false); trigger.current = null; return; }
    }
  }

  return (
    <div className="relative">
      <div
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onKeyUp={detectTrigger}
        onClick={detectTrigger}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        style={{ minHeight: rows * 24 }}
        className={`mention-editor ${className}`}
      />

      {open && (
        <div className="absolute z-40 left-0 right-0 sm:right-auto sm:min-w-[300px] mt-1.5 rounded-xl border border-border bg-card shadow-2xl shadow-black/30 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-secondary/40">
            <AtSign className="w-3.5 h-3.5 text-[#d97757]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {query ? `People matching “${query}”` : "Mention someone"}
            </span>
            {searching && <Loader2 className="w-3 h-3 text-muted-foreground animate-spin ml-auto" />}
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {!searching && hits.length === 0 && (
              <div className="px-3 py-6 text-center">
                <p className="text-sm text-muted-foreground">No people found</p>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">Try a different name</p>
              </div>
            )}
            {hits.map((u, i) => {
              const active = i === activeIdx;
              return (
                <button
                  key={u.id}
                  type="button"
                  onMouseEnter={() => setActiveIdx(i)}
                  onMouseDown={(e) => { e.preventDefault(); pick(u); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors relative ${
                    active ? "bg-[#d97757]/10" : "hover:bg-secondary/60"
                  }`}
                >
                  {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-[#d97757]" />}
                  <Avatar
                    name={u.name}
                    avatar={u.avatar}
                    seed={u.id}
                    size="w-8 h-8"
                    className="flex-shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-foreground truncate">{u.name}</span>
                    <span className="block text-[11px] text-muted-foreground/70 truncate">
                      @{u.name.replace(/\s+/g, "").toLowerCase()}
                    </span>
                  </span>
                  {active && (
                    <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-secondary border border-border/70 text-[10px] font-mono text-muted-foreground flex-shrink-0">
                      ↵
                    </kbd>
                  )}
                </button>
              );
            })}
          </div>

          {hits.length > 0 && (
            <div className="flex items-center gap-3 px-3 py-1.5 border-t border-border bg-secondary/30 text-[10px] text-muted-foreground/70">
              <span><kbd className="font-mono">↑↓</kbd> navigate</span>
              <span><kbd className="font-mono">↵</kbd> select</span>
              <span><kbd className="font-mono">esc</kbd> dismiss</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
