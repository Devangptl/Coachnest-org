"use client";

import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
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
   * Optional override for image insertion. Return a URL to embed (or null to
   * cancel). When omitted, the editor uploads the picked file to /api/upload
   * directly so authors don't have to deal with URLs.
   */
  onPickImage?: () => Promise<string | null | undefined>;
  /** Folder for direct uploads via the default image handler. */
  uploadFolder?: "courses" | "blogs" | "misc";
}

const TOOLBAR = [
  [{ header: [1, 2, 3, 4, false] }],
  [{ size: ["small", false, "large", "huge"] }],
  ["bold", "italic", "underline", "strike"],
  [{ color: [] }, { background: [] }],
  [{ script: "sub" }, { script: "super" }],
  ["blockquote", "code-block"],
  [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
  [{ indent: "-1" }, { indent: "+1" }],
  [{ align: [] }],
  [{ direction: "rtl" }],
  ["link", "image", "video"],
  ["clean"],
];

// Markdown shortcut keyboard bindings.
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

const IMAGE_MAX_BYTES = 1 * 1024 * 1024; // matches /api/upload limit

async function uploadImageFile(file: File, folder: string): Promise<string | null> {
  if (!file.type.startsWith("image/")) {
    toast.error("Only image files are supported.");
    return null;
  }
  if (file.size > IMAGE_MAX_BYTES) {
    toast.error("Image exceeds the 1 MB limit.");
    return null;
  }
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);
  try {
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Image upload failed.");
      return null;
    }
    return data.url as string;
  } catch {
    toast.error("Network error while uploading image.");
    return null;
  }
}

function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    // If the dialog is dismissed without selecting, no event fires; resolve null
    // when focus returns to the window.
    const onFocus = () => {
      window.removeEventListener("focus", onFocus);
      setTimeout(() => resolve(input.files?.[0] ?? null), 300);
    };
    window.addEventListener("focus", onFocus);
    input.click();
  });
}

export default function QuillEditor({
  value,
  onChange,
  placeholder = "Start writing…",
  minHeight = 280,
  className,
  onPickImage,
  uploadFolder = "courses",
}: QuillEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quillRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  const onPickImageRef = useRef(onPickImage);
  const uploadFolderRef = useRef(uploadFolder);
  const isInternalChange = useRef(false);

  onChangeRef.current = onChange;
  onPickImageRef.current = onPickImage;
  uploadFolderRef.current = uploadFolder;

  useEffect(() => {
    if (quillRef.current || !containerRef.current) return;

    (async () => {
      const { default: Quill } = await import("quill");

      type EditorQuill = {
        getSelection: () => { index: number } | null;
        insertEmbed: (i: number, t: string, v: unknown, s: string) => void;
        setSelection: (i: number, l?: number) => void;
        root: HTMLElement;
      };

      function insertImage(quill: EditorQuill, url: string) {
        const range = quill.getSelection() ?? { index: 0 };
        quill.insertEmbed(range.index, "image", url, "user");
        quill.setSelection(range.index + 1, 0);
      }

      const imageHandler = async function (this: { quill: EditorQuill }) {
        const customPick = onPickImageRef.current;
        if (customPick) {
          const url = await customPick();
          if (url) insertImage(this.quill, url);
          return;
        }
        const file = await pickImageFile();
        if (!file) return;
        const t = toast.loading("Uploading image…");
        const url = await uploadImageFile(file, uploadFolderRef.current);
        toast.dismiss(t);
        if (url) {
          insertImage(this.quill, url);
          toast.success("Image inserted");
        }
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

      // Drag-and-drop + paste image upload — works regardless of toolbar use.
      const editorEl = quill.root as HTMLElement;
      editorEl.addEventListener("drop", (e: DragEvent) => {
        const file = e.dataTransfer?.files?.[0];
        if (!file || !file.type.startsWith("image/")) return;
        e.preventDefault();
        e.stopPropagation();
        (async () => {
          const t = toast.loading("Uploading image…");
          const url = await uploadImageFile(file, uploadFolderRef.current);
          toast.dismiss(t);
          if (url) {
            insertImage(quill as unknown as EditorQuill, url);
            toast.success("Image inserted");
          }
        })();
      });
      editorEl.addEventListener("paste", (e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const it of Array.from(items)) {
          if (it.kind === "file" && it.type.startsWith("image/")) {
            const file = it.getAsFile();
            if (!file) continue;
            e.preventDefault();
            (async () => {
              const t = toast.loading("Uploading image…");
              const url = await uploadImageFile(file, uploadFolderRef.current);
              toast.dismiss(t);
              if (url) {
                insertImage(quill as unknown as EditorQuill, url);
                toast.success("Image inserted");
              }
            })();
            return;
          }
        }
      });

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
