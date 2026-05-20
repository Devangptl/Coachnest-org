"use client";

import { useRef, useCallback } from "react";
import {
  Bold, Italic, Underline, Strikethrough, Code, Quote,
  List, ListOrdered, Heading1, Heading2, Heading3,
  Link2, Image, Table, Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import MarkdownRenderer from "./MarkdownRenderer";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  showPreview: boolean;
  onPickImage?: () => Promise<string | null | undefined>;
}

// ── Wrap/insert helpers ────────────────────────────────────────────────────────

interface InsertOpts {
  prefix: string;
  suffix?: string;
  defaultText?: string;
  block?: boolean;
}

export default function MarkdownTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 384,
  showPreview,
  onPickImage,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyFormat = useCallback(
    ({ prefix, suffix = "", defaultText = "text", block = false }: InsertOpts) => {
      const ta = textareaRef.current;
      if (!ta) return;

      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = value.slice(start, end) || defaultText;

      let before = value.slice(0, start);
      let after = value.slice(end);

      let insert: string;
      if (block) {
        // Ensure the block starts on its own line
        if (before && !before.endsWith("\n")) before += "\n";
        insert = `${prefix}${selected}${suffix}\n`;
      } else {
        insert = `${prefix}${selected}${suffix}`;
      }

      const next = before + insert + after;
      onChange(next);

      // Restore selection inside the inserted text
      const newCursor = before.length + prefix.length + selected.length;
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(
          before.length + prefix.length,
          newCursor,
        );
      });
    },
    [value, onChange],
  );

  const insertLink = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const sel = value.slice(ta.selectionStart, ta.selectionEnd);
    const text = sel || "link text";
    applyFormat({ prefix: `[${text}](`, suffix: ")", defaultText: "url" });
  }, [value, applyFormat]);

  const insertImage = useCallback(async () => {
    if (onPickImage) {
      const url = await onPickImage();
      if (url) {
        const ta = textareaRef.current;
        const pos = ta ? ta.selectionStart : value.length;
        const before = value.slice(0, pos);
        const after = value.slice(pos);
        const insert = `![image](${url})`;
        onChange(before + insert + after);
        requestAnimationFrame(() => {
          ta?.focus();
          ta?.setSelectionRange(pos + insert.length, pos + insert.length);
        });
      }
      return;
    }
    // Fallback: insert placeholder
    applyFormat({ prefix: "![", suffix: "](url)", defaultText: "alt text" });
  }, [value, onChange, onPickImage, applyFormat]);

  const insertTable = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const before = value.slice(0, pos);
    const after = value.slice(pos);
    const table =
      "\n| Header 1 | Header 2 | Header 3 |\n" +
      "| --- | --- | --- |\n" +
      "| Cell 1 | Cell 2 | Cell 3 |\n" +
      "| Cell 4 | Cell 5 | Cell 6 |\n";
    const next = (before.endsWith("\n") ? before : before + "\n") + table + after;
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const cur = (before.endsWith("\n") ? before : before + "\n").length + 2;
      ta.setSelectionRange(cur, cur + "Header 1".length);
    });
  }, [value, onChange]);

  const insertHr = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const before = value.slice(0, pos);
    const after = value.slice(pos);
    const hr = (before.endsWith("\n") ? "" : "\n") + "\n---\n\n";
    onChange(before + hr + after);
    requestAnimationFrame(() => {
      ta.focus();
      const cur = before.length + hr.length;
      ta.setSelectionRange(cur, cur);
    });
  }, [value, onChange]);

  const toolbarButtons = [
    { title: "Heading 1",    Icon: Heading1,       action: () => applyFormat({ prefix: "# ",    defaultText: "Heading 1", block: true }) },
    { title: "Heading 2",    Icon: Heading2,       action: () => applyFormat({ prefix: "## ",   defaultText: "Heading 2", block: true }) },
    { title: "Heading 3",    Icon: Heading3,       action: () => applyFormat({ prefix: "### ",  defaultText: "Heading 3", block: true }) },
    null, // separator
    { title: "Bold",         Icon: Bold,           action: () => applyFormat({ prefix: "**",  suffix: "**",  defaultText: "bold text" }) },
    { title: "Italic",       Icon: Italic,         action: () => applyFormat({ prefix: "*",   suffix: "*",   defaultText: "italic text" }) },
    { title: "Underline",    Icon: Underline,      action: () => applyFormat({ prefix: "<u>", suffix: "</u>",defaultText: "underline text" }) },
    { title: "Strikethrough",Icon: Strikethrough,  action: () => applyFormat({ prefix: "~~",  suffix: "~~",  defaultText: "strikethrough" }) },
    null, // separator
    { title: "Inline code",  Icon: Code,           action: () => applyFormat({ prefix: "`",   suffix: "`",   defaultText: "code" }) },
    { title: "Blockquote",   Icon: Quote,          action: () => applyFormat({ prefix: "> ",              defaultText: "quoted text", block: true }) },
    { title: "Code block",   Icon: null,           action: () => applyFormat({ prefix: "```\n",suffix: "\n```",defaultText: "code here", block: true }), label: "</>"},
    null, // separator
    { title: "Bullet list",  Icon: List,           action: () => applyFormat({ prefix: "- ",  defaultText: "list item", block: true }) },
    { title: "Ordered list", Icon: ListOrdered,    action: () => applyFormat({ prefix: "1. ", defaultText: "list item", block: true }) },
    null, // separator
    { title: "Link",         Icon: Link2,          action: insertLink },
    { title: "Image",        Icon: Image,          action: insertImage },
    { title: "Table",        Icon: Table,          action: insertTable },
    { title: "Divider",      Icon: Minus,          action: insertHr },
  ] as const;

  return (
    <div className="md-editor-root">
      {/* Toolbar */}
      <div className="md-editor-toolbar flex flex-wrap items-center gap-0.5 px-2.5 py-2 bg-[hsl(var(--secondary))] border-b border-[hsl(var(--border))]">
        {toolbarButtons.map((btn, i) =>
          btn === null ? (
            <span key={`sep-${i}`} className="w-px h-5 bg-[hsl(var(--border)/0.8)] mx-1.5 shrink-0" />
          ) : (
            <button
              key={btn.title}
              type="button"
              title={btn.title}
              onMouseDown={(e) => { e.preventDefault(); btn.action(); }}
              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--foreground)/0.07)] active:bg-[hsl(var(--foreground)/0.12)] transition-all text-xs font-mono font-bold"
            >
              {"label" in btn && btn.label
                ? btn.label
                : btn.Icon
                ? <btn.Icon className="w-3.5 h-3.5" />
                : null}
            </button>
          ),
        )}
      </div>

      {/* Body: edit or preview */}
      {showPreview ? (
        <div
          className="md-preview-pane overflow-auto p-4 bg-[hsl(var(--secondary)/0.3)]"
          style={{ minHeight }}
        >
          {value.trim() ? (
            <MarkdownRenderer content={value} />
          ) : (
            <p className="text-[hsl(var(--muted-foreground))] italic text-sm">
              Nothing to preview yet.
            </p>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "Write Markdown here…"}
          className={cn(
            "md-editor-textarea w-full resize-y bg-[hsl(var(--secondary)/0.3)]",
            "text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))]",
            "font-mono text-sm leading-relaxed p-4 outline-none",
            "focus:bg-[hsl(var(--secondary)/0.5)] transition-colors",
          )}
          style={{ minHeight }}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
        />
      )}
    </div>
  );
}
