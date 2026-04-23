"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface QuillEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Minimum editor height in pixels (default 280) */
  minHeight?: number;
  className?: string;
}

const TOOLBAR = [
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline", "strike"],
  ["blockquote", "code-block"],
  [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
  [{ indent: "-1" }, { indent: "+1" }],
  ["link", "image"],
  ["clean"],
];

// Markdown shortcut keyboard bindings — type the shortcut then space/enter
// to convert the line to the corresponding Quill format.
function makeMarkdownBindings(quill: { formatLine: Function; deleteText: Function }) {
  return {
    "md-h1": {
      key: " ",
      prefix: /^#$/,
      handler(range: { index: number }, ctx: { prefix: string }) {
        quill.formatLine(range.index, 1, "header", 1, "user");
        quill.deleteText(range.index - ctx.prefix.length, ctx.prefix.length, "user");
        return false;
      },
    },
    "md-h2": {
      key: " ",
      prefix: /^##$/,
      handler(range: { index: number }, ctx: { prefix: string }) {
        quill.formatLine(range.index, 1, "header", 2, "user");
        quill.deleteText(range.index - ctx.prefix.length, ctx.prefix.length, "user");
        return false;
      },
    },
    "md-h3": {
      key: " ",
      prefix: /^###$/,
      handler(range: { index: number }, ctx: { prefix: string }) {
        quill.formatLine(range.index, 1, "header", 3, "user");
        quill.deleteText(range.index - ctx.prefix.length, ctx.prefix.length, "user");
        return false;
      },
    },
    "md-blockquote": {
      key: " ",
      prefix: /^>$/,
      handler(range: { index: number }, ctx: { prefix: string }) {
        quill.formatLine(range.index, 1, "blockquote", true, "user");
        quill.deleteText(range.index - ctx.prefix.length, ctx.prefix.length, "user");
        return false;
      },
    },
    "md-bullet": {
      key: " ",
      prefix: /^[-*]$/,
      handler(range: { index: number }, ctx: { prefix: string }) {
        quill.formatLine(range.index, 1, "list", "bullet", "user");
        quill.deleteText(range.index - ctx.prefix.length, ctx.prefix.length, "user");
        return false;
      },
    },
    "md-ordered": {
      key: " ",
      prefix: /^1\.$/,
      handler(range: { index: number }, ctx: { prefix: string }) {
        quill.formatLine(range.index, 1, "list", "ordered", "user");
        quill.deleteText(range.index - ctx.prefix.length, ctx.prefix.length, "user");
        return false;
      },
    },
    "md-code-block": {
      key: "Enter",
      prefix: /^```$/,
      handler(range: { index: number }, ctx: { prefix: string }) {
        quill.formatLine(range.index, 1, "code-block", true, "user");
        quill.deleteText(range.index - ctx.prefix.length, ctx.prefix.length, "user");
        return false;
      },
    },
  };
}

export default function QuillEditor({
  value,
  onChange,
  placeholder = "Start writing…",
  minHeight = 280,
  className,
}: QuillEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quillRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  const isInternalChange = useRef(false);

  onChangeRef.current = onChange;

  useEffect(() => {
    if (quillRef.current || !containerRef.current) return;

    (async () => {
      const { default: Quill } = await import("quill");
      await import("quill/dist/quill.snow.css");

      const quill = new Quill(containerRef.current!, {
        theme: "snow",
        placeholder,
        modules: {
          toolbar: TOOLBAR,
          keyboard: { bindings: makeMarkdownBindings(quill as never) },
        },
      });

      quillRef.current = quill;

      if (value) {
        quill.clipboard.dangerouslyPasteHTML(value);
        quill.history.clear();
      }

      quill.on("text-change", (_delta: unknown, _old: unknown, source: string) => {
        if (source !== "user") return;
        isInternalChange.current = true;
        onChangeRef.current(quill.getSemanticHTML());
        isInternalChange.current = false;
      });
    })();
  }, []); // intentional: initialize once on mount

  // Sync external resets (e.g. form cleared after submit)
  useEffect(() => {
    const quill = quillRef.current;
    if (!quill || isInternalChange.current) return;
    if (value === "" && quill.getLength() > 1) {
      quill.setContents([{ insert: "\n" }]);
      quill.history.clear();
    }
  }, [value]);

  return (
    <div className={cn("quill-editor-root", className)}>
      <div ref={containerRef} style={{ minHeight }} />
    </div>
  );
}
