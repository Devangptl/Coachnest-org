"use client";

/**
 * Textarea with @-mention autocomplete. Inserts tokens of the form
 *   @[Display Name](userId)
 * The server parses tokens for notifications; <MarkdownRenderer> renders
 * the raw token as a styled mention chip (no pre-transform needed).
 */
import { useEffect, useRef, useState } from "react";
import { AtSign, Loader2 } from "lucide-react";

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

/** Split a name on the query so the match can be emphasised. */
function highlight(name: string, q: string) {
  if (!q) return name;
  const i = name.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return name;
  return (
    <>
      {name.slice(0, i)}
      <span className="text-[#d97757] font-semibold">{name.slice(i, i + q.length)}</span>
      {name.slice(i + q.length)}
    </>
  );
}

export default function MentionTextarea({
  value,
  onChange,
  placeholder,
  rows = 4,
  className = "",
  autoFocus,
}: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [hits, setHits] = useState<UserHit[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  // Caret offset where the current "@query" starts
  const [anchor, setAnchor] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (anchor === null) { setOpen(false); setSearching(false); return; }
    setSearching(true);
    setOpen(true);
    const handle = setTimeout(async () => {
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
    return () => clearTimeout(handle);
  }, [query, anchor]);

  function detectMention(text: string, caret: number) {
    const upto = text.slice(0, caret);
    const match = upto.match(/(?:^|\s)@([\p{L}0-9_ ]{0,30})$/u);
    if (!match) { setAnchor(null); return; }
    setAnchor(upto.lastIndexOf("@"));
    setQuery(match[1]);
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    onChange(text);
    detectMention(text, e.target.selectionStart ?? text.length);
  }

  function pick(u: UserHit) {
    if (anchor === null || !taRef.current) return;
    const caret = taRef.current.selectionStart ?? value.length;
    const before = value.slice(0, anchor);
    const after = value.slice(caret);
    const token = `@[${u.name}](${u.id}) `;
    onChange(before + token + after);
    setOpen(false);
    setAnchor(null);
    requestAnimationFrame(() => {
      const pos = (before + token).length;
      taRef.current?.focus();
      taRef.current?.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!open || (!hits.length && !searching)) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => (i + 1) % hits.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => (i - 1 + hits.length) % hits.length); }
    else if ((e.key === "Enter" || e.key === "Tab") && hits.length) { e.preventDefault(); pick(hits[activeIdx]); }
    else if (e.key === "Escape") { e.preventDefault(); setOpen(false); setAnchor(null); }
  }

  return (
    <div className="relative">
      <textarea
        ref={taRef}
        rows={rows}
        value={value}
        autoFocus={autoFocus}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        className={className}
      />

      {open && (
        <div className="absolute z-40 left-0 right-0 sm:right-auto sm:min-w-[300px] mt-1.5 rounded-xl border border-border bg-card shadow-2xl shadow-black/30 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Header */}
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-secondary/40">
            <AtSign className="w-3.5 h-3.5 text-[#d97757]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {query ? `People matching “${query}”` : "Mention someone"}
            </span>
            {searching && <Loader2 className="w-3 h-3 text-muted-foreground animate-spin ml-auto" />}
          </div>

          {/* Results */}
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
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden bg-gradient-to-br from-[#d97757]/25 to-[#d97757]/5 text-[#d97757] ring-1 ring-border">
                    {u.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      u.name.charAt(0).toUpperCase()
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-foreground truncate">
                      {highlight(u.name, query)}
                    </span>
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

          {/* Footer hint */}
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
