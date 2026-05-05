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
  ["link", "image", "video", "table"],
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

      type TableQuill = EditorQuill & {
        getLength: () => number;
        clipboard: { dangerouslyPasteHTML: (i: number, html: string, s: string) => void };
      };

      function buildTableHTML(rows: number, cols: number) {
        let html = '<table class="lh-table"><tbody>';
        for (let r = 0; r < rows; r++) {
          html += "<tr>";
          for (let c = 0; c < cols; c++) {
            html += r === 0
              ? '<th><br></th>'
              : '<td><br></td>';
          }
          html += "</tr>";
        }
        html += "</tbody></table><p><br></p>";
        return html;
      }

      function insertTable(q: TableQuill, rows: number, cols: number) {
        const range = q.getSelection() ?? { index: q.getLength() };
        q.clipboard.dangerouslyPasteHTML(range.index, buildTableHTML(rows, cols), "user");
        q.setSelection(range.index + 1, 0);
      }

      const tableHandler = function (this: { quill: TableQuill }) {
        // Toolbar handler is intentionally a no-op — the picker popover (set up
        // after Quill mounts) drives insertion. Falling back to a 3×3 prompt
        // ensures the button always works even before the popover binds.
        const rows = 3, cols = 3;
        insertTable(this.quill, rows, cols);
      };

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
            handlers: { image: imageHandler, table: tableHandler },
          },
          keyboard: { bindings: MARKDOWN_BINDINGS },
        },
      });

      quillRef.current = quill;

      // ── Table button: replace plain icon + open hover-grid picker ──────────
      const root = containerRef.current!.parentElement;
      const tableBtn = root?.querySelector(".ql-table") as HTMLButtonElement | null;
      if (tableBtn) {
        tableBtn.title = "Insert table";
        tableBtn.innerHTML = `
          <svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="2.5" y="3.5" width="13" height="11" rx="1.5"/>
            <path d="M2.5 7.5h13M2.5 11h13M6 3.5v11M11 3.5v11"/>
          </svg>`;

        const ROWS = 8, COLS = 10;
        const pop = document.createElement("div");
        pop.className = "ql-table-picker";
        pop.style.display = "none";

        const grid = document.createElement("div");
        grid.className = "ql-table-picker-grid";
        grid.style.gridTemplateColumns = `repeat(${COLS}, 18px)`;

        const label = document.createElement("div");
        label.className = "ql-table-picker-label";
        label.textContent = "Pick size";

        const cells: HTMLElement[][] = [];
        for (let r = 0; r < ROWS; r++) {
          const row: HTMLElement[] = [];
          for (let c = 0; c < COLS; c++) {
            const cell = document.createElement("div");
            cell.className = "ql-table-picker-cell";
            cell.addEventListener("mouseenter", () => {
              for (let rr = 0; rr < ROWS; rr++)
                for (let cc = 0; cc < COLS; cc++)
                  cells[rr][cc].classList.toggle("active", rr <= r && cc <= c);
              label.textContent = `${r + 1} × ${c + 1}`;
            });
            cell.addEventListener("click", () => {
              insertTable(quill as unknown as TableQuill, r + 1, c + 1);
              hide();
            });
            grid.appendChild(cell);
            row.push(cell);
          }
          cells.push(row);
        }
        pop.appendChild(grid);
        pop.appendChild(label);
        document.body.appendChild(pop);

        const reset = () => {
          for (const row of cells) for (const c of row) c.classList.remove("active");
          label.textContent = "Pick size";
        };
        const show = () => {
          const rect = tableBtn.getBoundingClientRect();
          pop.style.display = "block";
          pop.style.position = "fixed";
          pop.style.top = `${rect.bottom + 6}px`;
          pop.style.left = `${rect.left}px`;
          pop.style.zIndex = "9999";
        };
        const hide = () => {
          pop.style.display = "none";
          reset();
        };

        tableBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (pop.style.display === "none") show(); else hide();
        });
        document.addEventListener("click", (e) => {
          if (pop.style.display === "none") return;
          if (!pop.contains(e.target as Node) && e.target !== tableBtn && !tableBtn.contains(e.target as Node)) hide();
        });

        // Cleanup popover when component unmounts
        const observer = new MutationObserver(() => {
          if (!document.body.contains(tableBtn)) {
            pop.remove();
            observer.disconnect();
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }

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
