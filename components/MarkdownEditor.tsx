"use client";

import { useState, useCallback, useRef } from "react";
import { Type, FileCode2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import QuillEditor from "./QuillEditor";
import MarkdownTextEditor from "./MarkdownTextEditor";
import { htmlToMarkdown, markdownToHtml } from "@/lib/markdownConvert";

type EditorMode = "rich-text" | "markdown";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Approximate row count — converted to minHeight (rows × 24 px) */
  rows?: number;
  /** Optional image picker — called when user clicks the toolbar image button. */
  onPickImage?: () => Promise<string | null | undefined>;
  /** Folder used for direct image uploads when no custom picker is set. */
  uploadFolder?: "courses" | "blogs" | "misc";
}

function isHtmlContent(s: string): boolean {
  return s.trimStart().startsWith("<");
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder,
  rows = 16,
  onPickImage,
  uploadFolder,
}: Props) {
  const minHeight = rows * 24;

  // Infer initial mode from content format: HTML → rich-text, otherwise markdown
  const [mode, setMode] = useState<EditorMode>(() =>
    isHtmlContent(value) ? "rich-text" : "markdown",
  );
  const [showPreview, setShowPreview] = useState(false);

  // Track converting state to avoid re-renders while the mode changes
  const converting = useRef(false);

  const switchToMarkdown = useCallback(() => {
    if (mode === "markdown" || converting.current) return;
    converting.current = true;
    if (isHtmlContent(value)) {
      onChange(htmlToMarkdown(value));
    }
    setMode("markdown");
    setShowPreview(false);
    converting.current = false;
  }, [mode, value, onChange]);

  const switchToRichText = useCallback(() => {
    if (mode === "rich-text" || converting.current) return;
    converting.current = true;
    if (!isHtmlContent(value)) {
      onChange(markdownToHtml(value));
    }
    setMode("rich-text");
    setShowPreview(false);
    converting.current = false;
  }, [mode, value, onChange]);

  return (
    <div className="md-editor-wrapper">
      {/* ── Mode toggle + preview toggle bar ─────────────────────────────── */}
      <div className="flex items-center justify-between mb-2">
        {/* Left: Rich Text / Markdown toggle */}
        <div
          className="inline-flex items-center gap-0.5 rounded-lg p-0.5 bg-[hsl(var(--secondary))] border border-[hsl(var(--border))]"
          role="tablist"
          aria-label="Editor mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "rich-text"}
            onClick={switchToRichText}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all",
              mode === "rich-text"
                ? "bg-[hsl(var(--primary))] text-white shadow-sm"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
            )}
          >
            <Type className="w-3.5 h-3.5" />
            Rich Text
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "markdown"}
            onClick={switchToMarkdown}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all",
              mode === "markdown"
                ? "bg-[hsl(var(--primary))] text-white shadow-sm"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
            )}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            Markdown
          </button>
        </div>

        {/* Right: Preview toggle (Markdown mode only) */}
        {mode === "markdown" && (
          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border transition-all",
              showPreview
                ? "border-[hsl(var(--primary)/0.5)] text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)]"
                : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:border-[hsl(var(--border))]",
            )}
          >
            {showPreview ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                Edit
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                Preview
              </>
            )}
          </button>
        )}
      </div>

      {/* ── Editor body ───────────────────────────────────────────────────── */}
      {mode === "rich-text" ? (
        <QuillEditor
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          minHeight={minHeight}
          onPickImage={onPickImage}
          uploadFolder={uploadFolder}
        />
      ) : (
        <MarkdownTextEditor
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          minHeight={minHeight}
          showPreview={showPreview}
          onPickImage={onPickImage}
        />
      )}

      {/* ── Mode hint ─────────────────────────────────────────────────────── */}
      <p className="text-[11px] text-[hsl(var(--muted-foreground)/0.6)] mt-1.5 leading-snug">
        {mode === "rich-text"
          ? "Rich Text mode — use the toolbar or Markdown shortcuts (# space, ** etc.)"
          : showPreview
          ? "Previewing rendered Markdown — click Edit to continue writing"
          : "Markdown mode — format with # headings, **bold**, *italic*, ``` code ``` and more"}
      </p>
    </div>
  );
}
