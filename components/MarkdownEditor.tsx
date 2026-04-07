"use client";

import { useState, useRef, useCallback } from "react";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Code2,
  List,
  ListOrdered,
  Minus,
  Eye,
  EyeOff,
  Quote,
  Link2,
  Image,
  Type,
  Hash,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { icon: Heading1, label: "Heading 1", prefix: "# ", suffix: "", block: true },
  { icon: Heading2, label: "Heading 2", prefix: "## ", suffix: "", block: true },
  { icon: Heading3, label: "Heading 3", prefix: "### ", suffix: "", block: true },
  { icon: Bold, label: "Bold", prefix: "**", suffix: "**" },
  { icon: Code2, label: "Inline Code", prefix: "`", suffix: "`" },
  { icon: Quote, label: "Blockquote", prefix: "> ", suffix: "", block: true },
  { icon: List, label: "Bullet List", prefix: "- ", suffix: "", block: true },
  { icon: ListOrdered, label: "Numbered List", prefix: "1. ", suffix: "", block: true },
  { icon: Minus, label: "Divider", prefix: "\n---\n", suffix: "", block: true },
  { icon: Link2, label: "Link", prefix: "[", suffix: "](url)" },
  { icon: Image, label: "Image", prefix: "![alt](", suffix: ")" },
];

export default function MarkdownEditor({ value, onChange, placeholder, rows = 12 }: Props) {
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = useCallback(
    (action: ToolbarAction) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = value.substring(start, end);
      const before = value.substring(0, start);
      const after = value.substring(end);

      let insertion: string;

      if (action.block && !selected) {
        // For block elements, ensure we're on a new line
        const needsNewline = before.length > 0 && !before.endsWith("\n");
        insertion = (needsNewline ? "\n" : "") + action.prefix + (selected || "text") + action.suffix;
      } else {
        insertion = action.prefix + (selected || "text") + action.suffix;
      }

      const newValue = before + insertion + after;
      onChange(newValue);

      // Restore cursor position after React re-render
      requestAnimationFrame(() => {
        textarea.focus();
        const cursorPos = before.length + insertion.length;
        textarea.setSelectionRange(cursorPos, cursorPos);
      });
    },
    [value, onChange]
  );

  const insertCodeBlock = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);
    const before = value.substring(0, start);
    const after = value.substring(end);

    const needsNewline = before.length > 0 && !before.endsWith("\n");
    const code = selected || "// your code here";
    const insertion = (needsNewline ? "\n" : "") + "```js\n" + code + "\n```\n";

    onChange(before + insertion + after);

    requestAnimationFrame(() => {
      textarea.focus();
      const cursorPos = before.length + insertion.length;
      textarea.setSelectionRange(cursorPos, cursorPos);
    });
  }, [value, onChange]);

  // Simple preview renderer
  const renderPreview = useCallback((text: string) => {
    return parseBlocks(text);
  }, []);

  return (
    <div className="rounded-md border border-border overflow-hidden bg-secondary/30">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-secondary/50 flex-wrap">
        {/* Formatting buttons */}
        {TOOLBAR_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => insertMarkdown(action)}
            title={action.label}
            className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-secondary transition-all"
          >
            <action.icon className="w-3.5 h-3.5" />
          </button>
        ))}

        {/* Code block (special) */}
        <button
          type="button"
          onClick={insertCodeBlock}
          title="Code Block"
          className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-secondary transition-all"
        >
          <span className="text-[10px] font-mono font-bold">{"{}"}</span>
        </button>

        <div className="flex-1" />

        {/* Preview toggle */}
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all",
            showPreview
              ? "bg-orange-500/15 text-orange-500 dark:text-orange-300 border border-orange-400/20"
              : "text-muted-foreground/60 hover:text-foreground hover:bg-secondary/80"
          )}
        >
          {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {showPreview ? "Edit" : "Preview"}
        </button>
      </div>

      {/* Editor / Preview */}
      {showPreview ? (
        <div className="px-5 py-4 min-h-[200px] max-h-[500px] overflow-y-auto">
          {value ? (
            <div className="space-y-4">{renderPreview(value)}</div>
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
          placeholder={placeholder || "Write your lesson content here…\n\nUse the toolbar above or write markdown directly:\n# Heading\n**bold** `code` \n- bullet list\n```js\ncode block\n```"}
          className="w-full bg-transparent px-5 py-4 text-foreground text-sm font-mono leading-relaxed resize-none focus:outline-none placeholder:text-muted-foreground/30"
          onKeyDown={(e) => {
            // Tab inserts 2 spaces
            if (e.key === "Tab") {
              e.preventDefault();
              const start = e.currentTarget.selectionStart;
              const end = e.currentTarget.selectionEnd;
              const newVal = value.substring(0, start) + "  " + value.substring(end);
              onChange(newVal);
              requestAnimationFrame(() => {
                e.currentTarget.setSelectionRange(start + 2, start + 2);
              });
            }
          }}
        />
      )}

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border/50 bg-secondary/30">
        <span className="text-[10px] text-muted-foreground/50 font-mono">
          {value.split("\n").length} lines · {value.length} chars
        </span>
        <span className="text-[10px] text-muted-foreground/50">Markdown supported</span>
      </div>
    </div>
  );
}

// ── Simple preview parser ────────────────────────────────────────────────────

function parseBlocks(raw: string) {
  const lines = raw.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trimStart().startsWith("```")) {
      const lang = line.trim().replace(/^```/, "").trim() || "code";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      elements.push(
        <PreviewCodeBlock key={key++} lang={lang} code={codeLines.join("\n")} />
      );
      continue;
    }

    // Divider
    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={key++} className="border-border my-2" />);
      i++;
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={key++} className="text-sm font-semibold text-foreground pt-1">
          {renderInlinePreview(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={key++} className="text-base font-semibold text-foreground border-l-2 border-orange-400/40 pl-3 pt-2">
          {renderInlinePreview(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={key++} className="text-xl font-bold text-foreground flex items-center gap-2">
          <Hash className="w-4 h-4 text-orange-400" />
          {renderInlinePreview(line.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      elements.push(
        <blockquote
          key={key++}
          className="border-l-2 border-amber-400/40 pl-3 text-muted-foreground text-sm italic"
        >
          {renderInlinePreview(line.slice(2))}
        </blockquote>
      );
      i++;
      continue;
    }

    // Bullet list
    if (/^[\s]*[-*•]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[\s]*[-*•]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[\s]*[-*•]\s+/, ""));
        i++;
      }
      elements.push(
        <ul key={key++} className="space-y-1.5 pl-1">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-muted-foreground text-sm">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-500/40 flex-shrink-0" />
              <span>{renderInlinePreview(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+[\.)]\s/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[\.)]\s/.test(lines[i].trim())) {
        items.push(lines[i].replace(/^\s*\d+[\.)]\s+/, ""));
        i++;
      }
      elements.push(
        <ol key={key++} className="space-y-1.5 pl-1">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-muted-foreground text-sm">
              <span className="flex-shrink-0 w-4 h-4 rounded bg-orange-500/20 text-orange-600 dark:text-orange-300 text-[10px] font-bold flex items-center justify-center mt-0.5">
                {j + 1}
              </span>
              <span>{renderInlinePreview(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].trimStart().startsWith("```") &&
      !/^[\s]*[-*•]\s/.test(lines[i]) &&
      !/^\d+[\.)]\s/.test(lines[i].trim()) &&
      !lines[i].startsWith("> ") &&
      !/^---+$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      elements.push(
        <p key={key++} className="text-muted-foreground text-sm leading-relaxed">
          {renderInlinePreview(paraLines.join(" "))}
        </p>
      );
    }
  }

  return elements;
}

function renderInlinePreview(text: string): React.ReactNode {
  // Process inline code, bold, links
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="px-1 py-0.5 rounded bg-orange-500/15 text-orange-600 dark:text-orange-300 text-[0.85em] font-mono border border-orange-400/30"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    // Bold
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((bp, j) => {
      if (bp.startsWith("**") && bp.endsWith("**")) {
        return (
          <strong key={`${i}-${j}`} className="font-semibold text-foreground">
            {bp.slice(2, -2)}
          </strong>
        );
      }
      // Links [text](url)
      const linkParts = bp.split(/(\[[^\]]+\]\([^)]+\))/g);
      return linkParts.map((lp, k) => {
        const linkMatch = lp.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
          return (
            <span key={`${i}-${j}-${k}`} className="text-orange-400 underline underline-offset-2">
              {linkMatch[1]}
            </span>
          );
        }
        return <span key={`${i}-${j}-${k}`}>{lp}</span>;
      });
    });
  });
}

function PreviewCodeBlock({ lang, code }: { lang: string; code: string }) {
  return (
    <div className="rounded-lg overflow-hidden border border-border bg-secondary dark:bg-[#0d1117]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/80 dark:bg-white/[0.03] border-b border-border/50">
        <div className="flex items-center gap-1.5">
          <Code2 className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
          <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">{lang}</span>
        </div>
      </div>
      <pre className="p-3 text-xs leading-relaxed overflow-x-auto">
        {code.split("\n").map((line, i) => (
          <div key={i} className="flex">
            <span className="select-none text-muted-foreground/30 text-right w-6 mr-3 flex-shrink-0 font-mono text-[10px] leading-relaxed">
              {i + 1}
            </span>
            <code className="font-mono text-emerald-700 dark:text-emerald-300/70">{line || " "}</code>
          </div>
        ))}
      </pre>
    </div>
  );
}
