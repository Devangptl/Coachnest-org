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

function countWords(value: string): number {
  const text = isHtmlContent(value)
    ? value.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ")
    : value;
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).filter(Boolean).length;
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

  const wordCount = countWords(value);
  const lineCount = mode === "markdown" && !showPreview
    ? (value.match(/\n/g)?.length ?? 0) + 1
    : null;

  return (
    <div className="rte-shell">
      {/* ── Header: mode tabs + preview toggle ───────────────────────────── */}
      <div className="rte-header-bar">
        <div className="rte-tabs" role="tablist" aria-label="Editor mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "rich-text"}
            onClick={switchToRichText}
            className={cn("rte-tab", mode === "rich-text" && "rte-tab--active")}
          >
            <Type className="w-3.5 h-3.5" />
            Rich Text
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "markdown"}
            onClick={switchToMarkdown}
            className={cn("rte-tab", mode === "markdown" && "rte-tab--active")}
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
              "rte-preview-toggle",
              showPreview && "rte-preview-toggle--active",
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

      {/* ── Status bar ────────────────────────────────────────────────────── */}
      <div className="rte-status-bar">
        <span>{wordCount.toLocaleString()} {wordCount === 1 ? "word" : "words"}</span>
        <span className="rte-status-dot" />
        <span>{value.length.toLocaleString()} chars</span>
        {lineCount !== null && (
          <>
            <span className="rte-status-dot" />
            <span>{lineCount.toLocaleString()} {lineCount === 1 ? "line" : "lines"}</span>
          </>
        )}
      </div>
    </div>
  );
}
