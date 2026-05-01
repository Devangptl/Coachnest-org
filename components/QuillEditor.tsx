"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import "quill/dist/quill.snow.css";

interface QuillEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Minimum editor height in pixels (default 280) */
  minHeight?: number;
  className?: string;
  /**
   * Called when the toolbar image button is pressed. Return the image URL to
   * insert (or null/undefined to cancel). When omitted, Quill falls back to
   * its built-in OS file picker + base64 embed.
   */
  onPickImage?: () => Promise<string | null | undefined>;
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

// Markdown shortcut keyboard bindings.
// Quill binds each handler with `this` = the keyboard module, which exposes
// `this.quill` — so handlers don't need to capture the quill instance at all,
// avoiding the temporal-dead-zone issue of referencing `quill` inside its own
// constructor call.
type KbCtx = { quill: { formatLine: Function; deleteText: Function } };

const MARKDOWN_BINDINGS = {
  "md-h1": {
    key: " ",
    prefix: /^#$/,
    handler(this: KbCtx, range: { index: number }, ctx: { prefix: string }) {
      this.quill.formatLine(range.index, 1, "header", 1, "user");
      this.quill.deleteText(range.index - ctx.prefix.length, ctx.prefix.length, "user");
      return false;
    },
  },
  "md-h2": {
    key: " ",
    prefix: /^##$/,
    handler(this: KbCtx, range: { index: number }, ctx: { prefix: string }) {
      this.quill.formatLine(range.index, 1, "header", 2, "user");
      this.quill.deleteText(range.index - ctx.prefix.length, ctx.prefix.length, "user");
      return false;
    },
  },
  "md-h3": {
    key: " ",
    prefix: /^###$/,
    handler(this: KbCtx, range: { index: number }, ctx: { prefix: string }) {
      this.quill.formatLine(range.index, 1, "header", 3, "user");
      this.quill.deleteText(range.index - ctx.prefix.length, ctx.prefix.length, "user");
      return false;
    },
  },
  "md-blockquote": {
    key: " ",
    prefix: /^>$/,
    handler(this: KbCtx, range: { index: number }, ctx: { prefix: string }) {
      this.quill.formatLine(range.index, 1, "blockquote", true, "user");
      this.quill.deleteText(range.index - ctx.prefix.length, ctx.prefix.length, "user");
      return false;
    },
  },
  "md-bullet": {
    key: " ",
    prefix: /^[-*]$/,
    handler(this: KbCtx, range: { index: number }, ctx: { prefix: string }) {
      this.quill.formatLine(range.index, 1, "list", "bullet", "user");
      this.quill.deleteText(range.index - ctx.prefix.length, ctx.prefix.length, "user");
      return false;
    },
  },
  "md-ordered": {
    key: " ",
    prefix: /^1\.$/,
    handler(this: KbCtx, range: { index: number }, ctx: { prefix: string }) {
      this.quill.formatLine(range.index, 1, "list", "ordered", "user");
      this.quill.deleteText(range.index - ctx.prefix.length, ctx.prefix.length, "user");
      return false;
    },
  },
  "md-code-block": {
    key: "Enter",
    prefix: /^```$/,
    handler(this: KbCtx, range: { index: number }, ctx: { prefix: string }) {
      this.quill.formatLine(range.index, 1, "code-block", true, "user");
      this.quill.deleteText(range.index - ctx.prefix.length, ctx.prefix.length, "user");
      return false;
    },
  },
};

export default function QuillEditor({
  value,
  onChange,
  placeholder = "Start writing…",
  minHeight = 280,
  className,
  onPickImage,
}: QuillEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quillRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  const onPickImageRef = useRef(onPickImage);
  const isInternalChange = useRef(false);

  onChangeRef.current = onChange;
  onPickImageRef.current = onPickImage;

  useEffect(() => {
    if (quillRef.current || !containerRef.current) return;

    (async () => {
      const { default: Quill } = await import("quill");

      const imageHandler = async function (this: { quill: { getSelection: () => { index: number } | null; insertEmbed: (i: number, t: string, v: unknown, s: string) => void; setSelection: (i: number, l?: number) => void } }) {
        const pick = onPickImageRef.current;
        if (!pick) {
          // No custom picker — let Quill run its default handler. Because we
          // registered our own handler, we need to emulate the default (file
          // picker + base64 insert). Simplest: prompt for URL.
          const url = window.prompt("Image URL");
          if (!url) return;
          const range = this.quill.getSelection() || { index: this.quill.getSelection()?.index ?? 0 };
          this.quill.insertEmbed(range.index, "image", url, "user");
          this.quill.setSelection(range.index + 1, 0);
          return;
        }
        const url = await pick();
        if (!url) return;
        const range = this.quill.getSelection() || { index: 0 };
        this.quill.insertEmbed(range.index, "image", url, "user");
        this.quill.setSelection(range.index + 1, 0);
      };

      const quill = new Quill(containerRef.current!, {
        theme: "snow",
        placeholder,
        modules: {
          toolbar: {
            container: TOOLBAR,
            handlers: { image: imageHandler },
          },
          keyboard: { bindings: MARKDOWN_BINDINGS },
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
