"use client";

/**
 * MarkdownEditor — rich toolbar + live preview for lesson content authoring.
 *
 * Toolbar actions: H1-H3, Bold, Italic, Strikethrough, Inline code, Code block,
 * Blockquote, Callout (Note/Tip/Warning), Bullet list, Numbered list, Task list,
 * Table, Link, Image, Video embed, Divider.
 *
 * Preview uses the shared <MarkdownRenderer> so authors see exactly what learners see.
 */

import { useState, useRef, useCallback } from "react";
import {
  Bold, Italic, Strikethrough,
  Heading1, Heading2, Heading3,
  Code2, List, ListOrdered, ListChecks,
  Minus, Eye, EyeOff, Quote,
  Link2, Image, Table, Video,
  Info, Lightbulb, AlertTriangle,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import MarkdownRenderer from "@/components/MarkdownRenderer";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

interface ToolbarAction {
  icon: React.ElementType;
  label: string;
  prefix: string;
  suffix: string;
  block?: boolean;
  placeholder?: string;
}

// ─── Toolbar groups ─────────────────────────────────────────────────────────────

const HEADING_ACTIONS: ToolbarAction[] = [
  { icon: Heading1, label: "Heading 1", prefix: "# ",   suffix: "", block: true, placeholder: "Heading" },
  { icon: Heading2, label: "Heading 2", prefix: "## ",  suffix: "", block: true, placeholder: "Heading" },
  { icon: Heading3, label: "Heading 3", prefix: "### ", suffix: "", block: true, placeholder: "Heading" },
];

const INLINE_ACTIONS: ToolbarAction[] = [
  { icon: Bold,          label: "Bold",          prefix: "**",  suffix: "**",  placeholder: "bold text"   },
  { icon: Italic,        label: "Italic",        prefix: "*",   suffix: "*",   placeholder: "italic text" },
  { icon: Strikethrough, label: "Strikethrough", prefix: "~~",  suffix: "~~",  placeholder: "strikethrough" },
  { icon: Code2,         label: "Inline Code",   prefix: "`",   suffix: "`",   placeholder: "code"        },
];

const BLOCK_ACTIONS: ToolbarAction[] = [
  { icon: Quote,        label: "Blockquote",    prefix: "> ",  suffix: "", block: true, placeholder: "quote" },
  { icon: List,         label: "Bullet List",   prefix: "- ",  suffix: "", block: true, placeholder: "item" },
  { icon: ListOrdered,  label: "Numbered List", prefix: "1. ", suffix: "", block: true, placeholder: "item" },
  { icon: ListChecks,   label: "Task List",     prefix: "- [ ] ", suffix: "", block: true, placeholder: "task" },
];

const CALLOUT_TEMPLATES = [
  { icon: Info,          label: "Note callout",      snippet: "> [!NOTE]\n> Your note here.\n" },
  { icon: Lightbulb,     label: "Tip callout",       snippet: "> [!TIP]\n> A helpful tip here.\n" },
  { icon: AlertTriangle, label: "Warning callout",   snippet: "> [!WARNING]\n> Important warning here.\n" },
];

// ─── Insert helpers ─────────────────────────────────────────────────────────────

function wrapSelection(
  value: string,
  start: number,
  end: number,
  action: ToolbarAction
): { newValue: string; cursor: number } {
  const selected = value.substring(start, end);
  const before   = value.substring(0, start);
  const after    = value.substring(end);

  let insertion: string;

  if (action.block) {
    const needsNewline = before.length > 0 && !before.endsWith("\n");
    const ph = action.placeholder ?? "text";
    insertion = (needsNewline ? "\n" : "") + action.prefix + (selected || ph) + action.suffix;
  } else {
    const ph2 = action.placeholder ?? "text";
    insertion = action.prefix + (selected || ph2) + action.suffix;
  }

  return { newValue: before + insertion + after, cursor: before.length + insertion.length };
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function MarkdownEditor({ value, onChange, placeholder, rows = 16 }: Props) {
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Generic insert
  const insert = useCallback(
    (action: ToolbarAction) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const { newValue, cursor } = wrapSelection(value, ta.selectionStart, ta.selectionEnd, action);
      onChange(newValue);
      requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(cursor, cursor); });
    },
    [value, onChange]
  );

  // Insert raw snippet at cursor
  const insertSnippet = useCallback(
    (snippet: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const before = value.substring(0, ta.selectionStart);
      const after  = value.substring(ta.selectionEnd);
      const needsNewline = before.length > 0 && !before.endsWith("\n");
      const insertion = (needsNewline ? "\n" : "") + snippet;
      const newValue = before + insertion + after;
      onChange(newValue);
      const cursor = before.length + insertion.length;
      requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(cursor, cursor); });
    },
    [value, onChange]
  );

  const insertCodeBlock = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const selected = value.substring(ta.selectionStart, ta.selectionEnd);
    const before   = value.substring(0, ta.selectionStart);
    const after    = value.substring(ta.selectionEnd);
    const needsNewline = before.length > 0 && !before.endsWith("\n");
    const code    = selected || "// your code here";
    const snippet = (needsNewline ? "\n" : "") + "```js\n" + code + "\n```\n";
    onChange(before + snippet + after);
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(before.length + snippet.length, before.length + snippet.length); });
  }, [value, onChange]);

  const insertTable = useCallback(() => {
    insertSnippet(
      "| Column 1 | Column 2 | Column 3 |\n" +
      "| -------- | -------- | -------- |\n" +
      "| Cell     | Cell     | Cell     |\n" +
      "| Cell     | Cell     | Cell     |\n"
    );
  }, [insertSnippet]);

  const insertVideo = useCallback(() => {
    const url = "https://www.youtube.com/watch?v=VIDEO_ID";
    insertSnippet(`::video[${url}]\n`);
  }, [insertSnippet]);

  const insertLink = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const raw      = value.substring(ta.selectionStart, ta.selectionEnd);
    const selected = raw.length > 0 ? raw : "link text";
    const before   = value.substring(0, ta.selectionStart);
    const after    = value.substring(ta.selectionEnd);
    const snippet  = `[${selected}](url)`;
    onChange(before + snippet + after);
    // Place cursor on "url"
    const urlStart = before.length + selected.length + 3;
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(urlStart, urlStart + 3); });
  }, [value, onChange]);

  const insertImage = useCallback(() => {
    insertSnippet("![Image description](https://example.com/image.png)\n");
  }, [insertSnippet]);

  const insertDivider = useCallback(() => {
    insertSnippet("\n---\n");
  }, [insertSnippet]);

  return (
    <div className="rounded-md border border-border overflow-hidden bg-secondary/30">

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-secondary/60 flex-wrap">

        {/* Headings */}
        {HEADING_ACTIONS.map((a) => (
          <ToolbarBtn key={a.label} icon={a.icon} label={a.label} onClick={() => insert(a)} />
        ))}

        <Divider />

        {/* Inline */}
        {INLINE_ACTIONS.map((a) => (
          <ToolbarBtn key={a.label} icon={a.icon} label={a.label} onClick={() => insert(a)} />
        ))}

        <Divider />

        {/* Block */}
        {BLOCK_ACTIONS.map((a) => (
          <ToolbarBtn key={a.label} icon={a.icon} label={a.label} onClick={() => insert(a)} />
        ))}

        {/* Code block */}
        <button
          type="button"
          onClick={insertCodeBlock}
          title="Code Block"
          className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-secondary transition-all"
        >
          <span className="text-[10px] font-mono font-bold leading-none">{"{}"}</span>
        </button>

        <Divider />

        {/* Callouts */}
        {CALLOUT_TEMPLATES.map((c) => (
          <ToolbarBtn key={c.label} icon={c.icon} label={c.label} onClick={() => insertSnippet(c.snippet)} />
        ))}

        <Divider />

        {/* Table / Video / Link / Image / HR */}
        <ToolbarBtn icon={Table}  label="Insert Table"     onClick={insertTable}  />
        <ToolbarBtn icon={Video}  label="Embed Video"      onClick={insertVideo}  />
        <ToolbarBtn icon={Link2}  label="Insert Link"      onClick={insertLink}   />
        <ToolbarBtn icon={Image}  label="Insert Image"     onClick={insertImage}  />
        <ToolbarBtn icon={Minus}  label="Horizontal Rule"  onClick={insertDivider} />

        <div className="flex-1" />

        {/* Preview toggle */}
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all",
            showPreview
              ? "bg-orange-500/15 text-orange-400 border border-orange-400/20"
              : "text-muted-foreground/60 hover:text-foreground hover:bg-secondary/80"
          )}
        >
          {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {showPreview ? "Edit" : "Preview"}
        </button>
      </div>

      {/* ── Editor / Preview ─────────────────────────────────────────────────── */}
      {showPreview ? (
        <div className="px-6 py-5 min-h-[240px] max-h-[600px] overflow-y-auto">
          {value.trim() ? (
            <MarkdownRenderer content={value} compact />
          ) : (
            <p className="text-muted-foreground/40 text-sm italic">Nothing to preview yet…</p>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={
            placeholder ||
            "Write your lesson content here…\n\n" +
            "# Heading 1\n## Heading 2\n\n" +
            "**bold**  *italic*  ~~strike~~  `code`\n\n" +
            "- bullet list\n1. numbered list\n- [ ] task list\n\n" +
            "```js\nconsole.log('code block')\n```\n\n" +
            "| Col A | Col B |\n| ----- | ----- |\n| cell  | cell  |\n\n" +
            "> [!NOTE]\n> A callout box\n\n" +
            "::video[https://youtube.com/watch?v=...]\n"
          }
          className="w-full bg-transparent px-5 py-4 text-foreground text-sm font-mono leading-relaxed resize-none focus:outline-none placeholder:text-muted-foreground/30"
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              e.preventDefault();
              const s = e.currentTarget.selectionStart;
              const end = e.currentTarget.selectionEnd;
              const nv = value.substring(0, s) + "  " + value.substring(end);
              onChange(nv);
              requestAnimationFrame(() => { e.currentTarget.setSelectionRange(s + 2, s + 2); });
            }
            // Ctrl/Cmd shortcuts
            if ((e.ctrlKey || e.metaKey)) {
              const shortcutMap: Record<string, ToolbarAction> = {
                b: { icon: Bold, label: "Bold",   prefix: "**", suffix: "**" },
                i: { icon: Italic, label: "Italic", prefix: "*",  suffix: "*"  },
                "`": { icon: Code2, label: "Code",   prefix: "`",  suffix: "`"  },
              };
              const action = shortcutMap[e.key];
              if (action) {
                e.preventDefault();
                insert(action);
              }
            }
          }}
        />
      )}

      {/* ── Status bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border/50 bg-secondary/30">
        <span className="text-[10px] text-muted-foreground/50 font-mono">
          {value.split("\n").length} lines · {value.length} chars
        </span>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground/40">
          <span>Ctrl+B Bold</span>
          <span>Ctrl+I Italic</span>
          <span>Tab → 2 spaces</span>
        </div>
      </div>
    </div>
  );
}

// ─── Micro-components ──────────────────────────────────────────────────────────

function ToolbarBtn({
  icon: Icon, label, onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-secondary transition-all"
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

function Divider() {
  return <span className="w-px h-4 bg-border/60 mx-0.5 flex-shrink-0" />;
}
