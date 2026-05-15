"use client";

/**
 * Textarea with @-mention autocomplete. Inserts tokens of the form
 *   @[Display Name](userId)
 * which the server parses for notifications and MarkdownRenderer renders
 * as mention chips (via the mentionsToMarkdown helper).
 */
import { useEffect, useRef, useState } from "react";

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
  const [activeIdx, setActiveIdx] = useState(0);
  // Caret position where the current "@query" starts
  const [anchor, setAnchor] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (anchor === null) { setOpen(false); return; }
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/community/users/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setHits(data.users || []);
        setActiveIdx(0);
        setOpen((data.users || []).length > 0);
      } catch {
        setOpen(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [query, anchor]);

  function detectMention(text: string, caret: number) {
    // Look back from caret for an "@" that starts a mention token
    const upto = text.slice(0, caret);
    const match = upto.match(/(?:^|\s)@([\p{L}0-9_ ]{0,30})$/u);
    if (!match) { setAnchor(null); return; }
    const at = upto.lastIndexOf("@");
    setAnchor(at);
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
    const next = before + token + after;
    onChange(next);
    setOpen(false);
    setAnchor(null);
    // Restore focus + caret after the inserted token
    requestAnimationFrame(() => {
      const pos = (before + token).length;
      taRef.current?.focus();
      taRef.current?.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => (i + 1) % hits.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => (i - 1 + hits.length) % hits.length); }
    else if (e.key === "Enter" && open) { e.preventDefault(); pick(hits[activeIdx]); }
    else if (e.key === "Escape") { setOpen(false); setAnchor(null); }
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
        placeholder={placeholder}
        className={className}
      />
      {open && (
        <div className="absolute z-40 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-md border border-border bg-card shadow-xl">
          {hits.map((u, i) => (
            <button
              key={u.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(u); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                i === activeIdx ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60"
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold flex-shrink-0 overflow-hidden">
                {u.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                ) : u.name.charAt(0).toUpperCase()}
              </span>
              <span className="truncate">{u.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
