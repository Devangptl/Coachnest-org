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

// ── Markdown paste helpers ─────────────────────────────────────────────────────

/** Returns true if the text contains at least one GFM separator row (|---|---| …). */
function hasMarkdownTable(text: string): boolean {
  if (!text.includes("|")) return false;
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return normalized.split("\n").some((l) => /^\|[\s\-:|]+\|$/.test(l.trim()));
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const HR_RE = /^[ \t]*(?:(?:-[ \t]*){3,}|(?:\*[ \t]*){3,}|(?:_[ \t]*){3,})$/;
const LIST_RE = /^([ \t]*)([-*+]|\d+[.)])[ \t]+(.*)$/;
const FENCE_RE = /^[ \t]*(`{3,}|~{3,})(.*)$/;

// Private-use sentinels that wrap tokenised code spans while emphasis is
// processed, so a span's contents are never reinterpreted as markdown.
const CODE_OPEN = String.fromCharCode(0xe000);
const CODE_CLOSE = String.fromCharCode(0xe001);

/**
 * Convert inline markdown (links, images, bold, italic, strikethrough, inline
 * code) to HTML. Code spans are tokenised first so their contents are never
 * reinterpreted as other markdown, then everything is HTML-escaped.
 */
function convertInline(raw: string): string {
  const codeTokens: string[] = [];
  let s = raw.replace(/`([^`]+?)`/g, (_m, code: string) => {
    codeTokens.push(code);
    return `${CODE_OPEN}${codeTokens.length - 1}${CODE_CLOSE}`;
  });

  s = escHtml(s);

  // Images: ![alt](url "title")
  s = s.replace(
    /!\[([^\]]*)\]\([ \t]*([^)\s]+)(?:[ \t]+"[^"]*")?[ \t]*\)/g,
    (_m, alt: string, url: string) => `<img src="${url}" alt="${alt}">`,
  );
  // Links: [text](url "title")
  s = s.replace(
    /\[([^\]]+)\]\([ \t]*([^)\s]+)(?:[ \t]+"[^"]*")?[ \t]*\)/g,
    (_m, text: string, url: string) => `<a href="${url}">${text}</a>`,
  );

  s = s.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  s = s.replace(/___(.+?)___/g, "<strong><em>$1</em></strong>");
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__(.+?)__/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*\w])\*(?!\s)([^*]+?)\*(?!\*)/g, "$1<em>$2</em>");
  s = s.replace(/(^|[^_\w])_(?!\s)([^_]+?)_(?![\w_])/g, "$1<em>$2</em>");
  s = s.replace(/~~(.+?)~~/g, "<del>$1</del>");

  const restore = new RegExp(`${CODE_OPEN}(\\d+)${CODE_CLOSE}`, "g");
  s = s.replace(restore, (_m, idx: string) =>
    `<code>${escHtml(codeTokens[Number(idx)])}</code>`);
  return s;
}

/** Escape HTML then convert inline markdown in a table cell. */
function convertCellContent(raw: string): string {
  return convertInline(raw);
}

/** Convert a block of table lines (already filtered to start with `|`) to an HTML table. */
function buildMarkdownTableHtml(lines: string[]): string {
  const sepIdx = lines.findIndex((l) => /^\|[\s\-:|]+\|$/.test(l));
  if (sepIdx === -1) return lines.map((l) => `<p>${escHtml(l)}</p>`).join("");

  const parseRow = (line: string) =>
    line.split("|").slice(1, -1).map((c) => c.trim());

  const headers = lines.slice(0, sepIdx);
  const rows    = lines.slice(sepIdx + 1).filter((l) => l.startsWith("|"));

  // Quill v2's table module only models <td> cells (grouped by row) — it has
  // no <th>/<thead> blot, so emitting those collapses the header into a single
  // cell. Every cell is a <td>; the header row is styled via CSS (first row).
  const cell = (c: string) => `<td>${convertCellContent(c) || "<br>"}</td>`;
  let html = '<table class="lh-table"><tbody>';
  for (const line of headers)
    html += "<tr>" + parseRow(line).map(cell).join("") + "</tr>";
  for (const line of rows)
    html += "<tr>" + parseRow(line).map(cell).join("") + "</tr>";
  html += "</tbody></table><p><br></p>";
  return html;
}

/** Build a (possibly nested) HTML list from collected list items. */
function buildListHtml(items: { indent: number; ordered: boolean; content: string }[]): string {
  // Snap raw indentation widths onto contiguous levels (0,1,2,…) so uneven
  // source indentation still nests predictably.
  const uniq = Array.from(new Set(items.map((x) => x.indent))).sort((a, b) => a - b);
  const levelOf = new Map(uniq.map((v, idx) => [v, idx] as const));
  const norm = items.map((x) => ({ ...x, indent: levelOf.get(x.indent)! }));

  let pos = 0;
  function build(level: number): string {
    const ordered = norm[pos].ordered;
    let out = ordered ? "<ol>" : "<ul>";
    while (pos < norm.length && norm[pos].indent >= level) {
      if (norm[pos].indent > level) break; // belongs to a deeper <li>
      const it = norm[pos];
      pos++;
      let li = `<li>${convertInline(it.content)}`;
      if (pos < norm.length && norm[pos].indent > level) li += build(norm[pos].indent);
      li += "</li>";
      out += li;
    }
    out += ordered ? "</ol>" : "</ul>";
    return out;
  }
  return build(norm[0].indent);
}

/** Heuristic: does the pasted plain text contain markdown syntax worth converting? */
function looksLikeMarkdown(text: string): boolean {
  if (!text) return false;
  if (hasMarkdownTable(text)) return true;
  return (
    /^[ \t]*#{1,6}[ \t]+\S/m.test(text) ||        // ATX heading
    new RegExp(FENCE_RE.source, "m").test(text) || // fenced code block
    /^[ \t]*>[ \t]?\S/m.test(text) ||              // blockquote
    /^[ \t]*[-*+][ \t]+\S/m.test(text) ||          // bullet list
    /^[ \t]*\d+[.)][ \t]+\S/m.test(text) ||        // ordered list
    new RegExp(HR_RE.source, "m").test(text) ||     // thematic break
    /\*\*[^*\n]+\*\*/.test(text) ||                // bold
    /__[^_\n]+__/.test(text) ||                    // bold
    /~~[^~\n]+~~/.test(text) ||                    // strikethrough
    /`[^`\n]+`/.test(text) ||                      // inline code
    /\[[^\]\n]+\]\([^)\n]+\)/.test(text) ||        // link
    /!\[[^\]\n]*\]\([^)\n]+\)/.test(text)          // image
  );
}

/**
 * Convert pasted plain-text markdown (headings, emphasis, lists, code blocks,
 * blockquotes, links/images and GFM tables) to HTML suitable for insertion via
 * Quill's dangerouslyPasteHTML.
 */
function convertMarkdownPaste(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  let html = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { i++; continue; }

    // ── Fenced code block ──────────────────────────────────────────────────
    const fence = trimmed.match(FENCE_RE);
    if (fence) {
      const fenceChar = fence[1][0];
      const fenceLen = fence[1].length;
      i++;
      const codeLines: string[] = [];
      while (i < lines.length) {
        const ct = lines[i].trim();
        const cm = ct.match(/^(`{3,}|~{3,})\s*$/);
        if (cm && ct[0] === fenceChar && cm[1].length >= fenceLen) { i++; break; }
        codeLines.push(lines[i]);
        i++;
      }
      html += `<pre>${escHtml(codeLines.join("\n")) || "<br>"}</pre>`;
      continue;
    }

    // ── ATX heading ────────────────────────────────────────────────────────
    const heading = trimmed.match(/^(#{1,6})[ \t]+(.*?)[ \t]*#*[ \t]*$/);
    if (heading) {
      const level = heading[1].length;
      html += `<h${level}>${convertInline(heading[2])}</h${level}>`;
      i++;
      continue;
    }

    // ── Thematic break ─────────────────────────────────────────────────────
    if (HR_RE.test(line) && !trimmed.startsWith("|")) {
      html += "<hr>";
      i++;
      continue;
    }

    // ── Table ──────────────────────────────────────────────────────────────
    if (trimmed.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      if (tableLines.some((l) => /^\|[\s\-:|]+\|$/.test(l))) {
        html += buildMarkdownTableHtml(tableLines);
      } else {
        for (const tl of tableLines) html += `<p>${convertInline(tl)}</p>`;
      }
      continue;
    }

    // ── Blockquote ─────────────────────────────────────────────────────────
    if (/^[ \t]*>/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^[ \t]*>/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^[ \t]*>[ \t]?/, ""));
        i++;
      }
      html += `<blockquote>${quoteLines
        .map((q) => convertInline(q) || "<br>")
        .join("<br>")}</blockquote>`;
      continue;
    }

    // ── List (ordered / unordered, nested by indentation) ──────────────────
    if (LIST_RE.test(line)) {
      const items: { indent: number; ordered: boolean; content: string }[] = [];
      while (i < lines.length) {
        const m = lines[i].match(LIST_RE);
        if (!m) break;
        items.push({
          indent: m[1].replace(/\t/g, "  ").length,
          ordered: /\d/.test(m[2]),
          content: m[3],
        });
        i++;
      }
      html += buildListHtml(items);
      continue;
    }

    // ── Paragraph (consecutive plain lines, soft-wrapped) ──────────────────
    const paraLines: string[] = [];
    while (i < lines.length) {
      const pl = lines[i];
      const pt = pl.trim();
      if (
        !pt ||
        FENCE_RE.test(pt) ||
        /^#{1,6}[ \t]+/.test(pt) ||
        /^[ \t]*>/.test(pl) ||
        pt.startsWith("|") ||
        LIST_RE.test(pl) ||
        (HR_RE.test(pl) && !pt.startsWith("|"))
      ) break;
      paraLines.push(pt);
      i++;
    }
    if (paraLines.length) html += `<p>${paraLines.map(convertInline).join("<br>")}</p>`;
  }

  return html || "<p><br></p>";
}

function validateImageFile(file: File): boolean {
  if (!file.type.startsWith("image/")) {
    toast.error("Only image files are supported.");
    return false;
  }
  if (file.size > IMAGE_MAX_BYTES) {
    toast.error("Image exceeds the 1 MB limit.");
    return false;
  }
  return true;
}

/** Read a File into a base64 data URL (no network request). */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
  // Tracks the last HTML the editor itself reported, so the value-sync effect
  // can distinguish editor-driven changes from external prop updates (e.g.
  // PDF import populating form.content from outside).
  const lastReportedValue = useRef<string>(value);

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
            html += '<td><br></td>';
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

      // Quill calls this when the toolbar button is clicked. We do nothing here —
      // the button's own click listener (set up below) opens the size-picker
      // popover, which calls insertTable when the user picks a grid cell.
      const tableHandler = function () { /* no-op */ };

      const imageHandler = async function (this: { quill: EditorQuill }) {
        // Custom picker (e.g. media-library) returns a ready URL — use it directly.
        const customPick = onPickImageRef.current;
        if (customPick) {
          const url = await customPick();
          if (url) insertImage(this.quill, url);
          return;
        }
        const file = await pickImageFile();
        if (!file || !validateImageFile(file)) return;
        // Embed as data URL now; actual upload happens in processContentImages()
        // when the user saves — preventing orphaned files on discard.
        const dataUrl = await fileToDataUrl(file);
        insertImage(this.quill, dataUrl);
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

      // ── Normalise non-breaking spaces on paste ─────────────────────────────
      // Pasting from websites/docs replaces regular spaces with &nbsp; (U+00A0).
      // These are unbreakable so long paragraphs overflow their container.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      quill.clipboard.addMatcher(Node.TEXT_NODE, (_node: Node, delta: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delta.ops = delta.ops.map((op: any) => {
          if (typeof op.insert === "string") {
            op.insert = op.insert.replace(/ /g, " ");
          }
          return op;
        });
        return delta;
      });

      // ── Strip non-semantic formatting on paste ─────────────────────────────
      // Keeps bold/italic/underline/strike/link/heading/list/code/blockquote.
      // Drops colors, backgrounds, font families, font sizes, and alignment so
      // pasted content from websites/docs matches the editor theme.
      // Table elements are excluded — Quill 2 uses internal Delta attributes
      // (table-cell-line, row, cell IDs) to encode table structure; stripping
      // those would corrupt tables on paste and on load from saved HTML.
      const KEEP_ATTRS = new Set([
        "bold", "italic", "underline", "strike",
        "link", "header", "list", "indent",
        "code", "code-block", "blockquote", "script",
      ]);
      const TABLE_TAGS = new Set(["TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TH", "TD", "CAPTION", "COLGROUP", "COL"]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      quill.clipboard.addMatcher(Node.ELEMENT_NODE, (_node: Node, delta: any) => {
        const tag = (_node as HTMLElement).tagName?.toUpperCase?.() ?? "";
        if (TABLE_TAGS.has(tag)) return delta; // preserve table structure attributes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delta.ops = delta.ops.map((op: any) => {
          if (op.attributes) {
            const clean: Record<string, unknown> = {};
            for (const key of Object.keys(op.attributes)) {
              if (KEEP_ATTRS.has(key)) clean[key] = op.attributes[key];
            }
            op.attributes = clean;
          }
          return op;
        });
        return delta;
      });

      // ── Table button: improved picker + floating table toolbar ──────────────
      const root = containerRef.current!.parentElement;
      const tableBtn = root?.querySelector(".ql-table") as HTMLButtonElement | null;
      if (tableBtn) {
        tableBtn.title = "Insert table";
        tableBtn.innerHTML = `
          <svg viewBox="0 0 18 18" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="2.5" y="3.5" width="13" height="11" rx="1.5"/>
            <path d="M2.5 7.5h13M2.5 11h13M6 3.5v11M11 3.5v11"/>
          </svg>`;

        // ── Table picker popover ────────────────────────────────────────────
        const PRESETS = [
          { label: "2×2", r: 2, c: 2 }, { label: "3×3", r: 3, c: 3 },
          { label: "3×5", r: 3, c: 5 }, { label: "4×4", r: 4, c: 4 },
          { label: "5×5", r: 5, c: 5 }, { label: "5×7", r: 5, c: 7 },
        ];
        const ROWS = 6, COLS = 8;

        const pop = document.createElement("div");
        pop.className = "ql-table-picker";
        pop.style.display = "none";

        const ph = document.createElement("div");
        ph.className = "ql-table-picker-header";
        ph.textContent = "Insert Table";
        pop.appendChild(ph);

        const presetsWrap = document.createElement("div");
        presetsWrap.className = "ql-table-picker-presets";
        for (const p of PRESETS) {
          const btn = document.createElement("button");
          btn.type = "button"; btn.className = "ql-table-preset-btn"; btn.textContent = p.label;
          btn.addEventListener("click", () => { insertTable(quill as unknown as TableQuill, p.r, p.c); hide(); });
          presetsWrap.appendChild(btn);
        }
        pop.appendChild(presetsWrap);

        const d1 = document.createElement("div"); d1.className = "ql-table-picker-divider"; pop.appendChild(d1);

        const grid = document.createElement("div");
        grid.className = "ql-table-picker-grid";
        grid.style.gridTemplateColumns = `repeat(${COLS}, 20px)`;

        const label = document.createElement("div");
        label.className = "ql-table-picker-label";
        label.textContent = "Hover to select size";

        const cells: HTMLElement[][] = [];
        for (let r = 0; r < ROWS; r++) {
          const rowCells: HTMLElement[] = [];
          for (let c = 0; c < COLS; c++) {
            const cell = document.createElement("div");
            cell.className = "ql-table-picker-cell";
            cell.addEventListener("mouseenter", () => {
              for (let rr = 0; rr < ROWS; rr++)
                for (let cc = 0; cc < COLS; cc++)
                  cells[rr][cc].classList.toggle("active", rr <= r && cc <= c);
              label.textContent = `${r + 1} × ${c + 1} table`;
            });
            cell.addEventListener("click", () => { insertTable(quill as unknown as TableQuill, r + 1, c + 1); hide(); });
            grid.appendChild(cell);
            rowCells.push(cell);
          }
          cells.push(rowCells);
        }
        grid.addEventListener("mouseleave", () => {
          for (const row of cells) for (const c of row) c.classList.remove("active");
          label.textContent = "Hover to select size";
        });
        pop.appendChild(grid);
        pop.appendChild(label);

        const d2 = document.createElement("div"); d2.className = "ql-table-picker-divider"; pop.appendChild(d2);

        const customWrap = document.createElement("div");
        customWrap.className = "ql-table-picker-custom";
        const rInput = document.createElement("input");
        rInput.type = "number"; rInput.min = "1"; rInput.max = "20"; rInput.value = "3";
        rInput.className = "ql-table-custom-input"; rInput.placeholder = "Rows";
        const csep = document.createElement("span");
        csep.className = "ql-table-custom-sep"; csep.textContent = "×";
        const cInput = document.createElement("input");
        cInput.type = "number"; cInput.min = "1"; cInput.max = "20"; cInput.value = "3";
        cInput.className = "ql-table-custom-input"; cInput.placeholder = "Cols";
        const insBtn = document.createElement("button");
        insBtn.type = "button"; insBtn.className = "ql-table-custom-btn"; insBtn.textContent = "Insert";
        insBtn.addEventListener("click", () => {
          const r = Math.max(1, Math.min(20, parseInt(rInput.value, 10) || 3));
          const c = Math.max(1, Math.min(20, parseInt(cInput.value, 10) || 3));
          insertTable(quill as unknown as TableQuill, r, c);
          hide();
        });
        customWrap.append(rInput, csep, cInput, insBtn);
        pop.appendChild(customWrap);
        document.body.appendChild(pop);

        const reset = () => {
          for (const row of cells) for (const c of row) c.classList.remove("active");
          label.textContent = "Hover to select size";
        };
        const show = () => {
          const rect = tableBtn.getBoundingClientRect();
          pop.style.display = "block";
          pop.style.position = "fixed";
          pop.style.top = `${rect.bottom + 6}px`;
          pop.style.left = `${rect.left}px`;
          pop.style.zIndex = "9999";
        };
        const hide = () => { pop.style.display = "none"; reset(); };

        tableBtn.addEventListener("click", (e) => {
          e.preventDefault(); e.stopPropagation();
          if (pop.style.display === "none") show(); else hide();
        });
        document.addEventListener("click", (e) => {
          if (pop.style.display === "none") return;
          if (!pop.contains(e.target as Node) && e.target !== tableBtn && !tableBtn.contains(e.target as Node)) hide();
        });

        // ── Floating table toolbar ─────────────────────────────────────────
        const tblToolbar = document.createElement("div");
        tblToolbar.className = "ql-table-toolbar";
        tblToolbar.style.cssText = "display:none;position:fixed;z-index:9998;";
        document.body.appendChild(tblToolbar);

        let curTable: HTMLTableElement | null = null;
        let curTr: HTMLTableRowElement | null = null;
        let curTd: HTMLTableCellElement | null = null;

        function getCellColIdx(cell: HTMLTableCellElement) {
          return Array.from((cell.parentElement as HTMLTableRowElement).cells).indexOf(cell);
        }
        function positionTblToolbar() {
          if (!curTable) { tblToolbar.style.display = "none"; return; }
          const rect = curTable.getBoundingClientRect();
          tblToolbar.style.top = `${rect.top - 36}px`;
          tblToolbar.style.left = `${rect.left}px`;
          tblToolbar.style.display = "flex";
        }
        function tblDomUpdate() { (quill as any).update("user"); positionTblToolbar(); } // eslint-disable-line @typescript-eslint/no-explicit-any

        const TBL_ACTIONS: { title: string; icon: string; danger?: boolean; action: () => void }[] = [
          {
            title: "Add row above",
            icon: `<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="7" width="14" height="8" rx="1"/><line x1="5" y1="7" x2="5" y2="15"/><line x1="11" y1="7" x2="11" y2="15"/><line x1="1" y1="11" x2="15" y2="11"/><path d="M8 5V2M6 4l2-2 2 2"/></svg>`,
            action() {
              if (!curTr) return;
              const nr = document.createElement("tr");
              for (let i = 0; i < curTr.cells.length; i++) { const td = document.createElement("td"); td.innerHTML = "<br>"; nr.appendChild(td); }
              curTr.parentElement?.insertBefore(nr, curTr);
              tblDomUpdate();
            },
          },
          {
            title: "Add row below",
            icon: `<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="1" width="14" height="8" rx="1"/><line x1="5" y1="1" x2="5" y2="9"/><line x1="11" y1="1" x2="11" y2="9"/><line x1="1" y1="5" x2="15" y2="5"/><path d="M8 11v3M6 12l2 2 2-2"/></svg>`,
            action() {
              if (!curTr) return;
              const nr = document.createElement("tr");
              for (let i = 0; i < curTr.cells.length; i++) { const td = document.createElement("td"); td.innerHTML = "<br>"; nr.appendChild(td); }
              curTr.parentElement?.insertBefore(nr, curTr.nextSibling);
              tblDomUpdate();
            },
          },
          {
            title: "Add column left",
            icon: `<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="1" width="8" height="14" rx="1"/><line x1="7" y1="5" x2="15" y2="5"/><line x1="7" y1="11" x2="15" y2="11"/><line x1="11" y1="1" x2="11" y2="15"/><path d="M5 8H2M4 6l-2 2 2 2"/></svg>`,
            action() {
              if (!curTable || !curTd) return;
              const ci = getCellColIdx(curTd);
              Array.from(curTable.rows).forEach(row => {
                const isHead = row.parentElement?.tagName === "THEAD";
                const nc = document.createElement(isHead ? "th" : "td"); nc.innerHTML = "<br>";
                row.insertBefore(nc, row.cells[ci] ?? null);
              });
              tblDomUpdate();
            },
          },
          {
            title: "Add column right",
            icon: `<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="1" width="8" height="14" rx="1"/><line x1="1" y1="5" x2="9" y2="5"/><line x1="1" y1="11" x2="9" y2="11"/><line x1="5" y1="1" x2="5" y2="15"/><path d="M11 8h3M12 6l2 2-2 2"/></svg>`,
            action() {
              if (!curTable || !curTd) return;
              const ci = getCellColIdx(curTd);
              Array.from(curTable.rows).forEach(row => {
                const isHead = row.parentElement?.tagName === "THEAD";
                const nc = document.createElement(isHead ? "th" : "td"); nc.innerHTML = "<br>";
                row.insertBefore(nc, row.cells[ci + 1] ?? null);
              });
              tblDomUpdate();
            },
          },
          {
            title: "Delete row", danger: true,
            icon: `<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="1" width="14" height="14" rx="1"/><line x1="5" y1="1" x2="5" y2="15"/><line x1="11" y1="1" x2="11" y2="15"/><line x1="1" y1="8" x2="15" y2="8"/><line x1="4" y1="4.5" x2="12" y2="4.5" stroke-dasharray="2 1.5"/><line x1="3.5" y1="3.5" x2="12.5" y2="5.5"/></svg>`,
            action() {
              if (!curTable || !curTr || curTable.rows.length <= 1) return;
              curTr.parentElement?.removeChild(curTr);
              curTr = null; curTd = null;
              tblDomUpdate();
            },
          },
          {
            title: "Delete column", danger: true,
            icon: `<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="1" width="14" height="14" rx="1"/><line x1="8" y1="1" x2="8" y2="15"/><line x1="1" y1="5" x2="15" y2="5"/><line x1="1" y1="11" x2="15" y2="11"/><line x1="5.5" y1="4" x2="5.5" y2="12" stroke-dasharray="2 1.5"/><line x1="4.5" y1="3.5" x2="6.5" y2="12.5"/></svg>`,
            action() {
              if (!curTable || !curTd) return;
              const ci = getCellColIdx(curTd);
              if ((curTd.parentElement as HTMLTableRowElement)?.cells.length <= 1) return;
              Array.from(curTable.rows).forEach(row => { const c = row.cells[ci]; if (c) row.removeChild(c); });
              curTd = null;
              tblDomUpdate();
            },
          },
          {
            title: "Delete table", danger: true,
            icon: `<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h12M5 4V2h6v2M4 4l.5 10h7L12 4"/><line x1="6.5" y1="7" x2="6.5" y2="11"/><line x1="9.5" y1="7" x2="9.5" y2="11"/></svg>`,
            action() {
              if (!curTable) return;
              curTable.parentElement?.removeChild(curTable);
              curTable = null; curTr = null; curTd = null;
              (quill as any).update("user"); // eslint-disable-line @typescript-eslint/no-explicit-any
              tblToolbar.style.display = "none";
            },
          },
        ];

        TBL_ACTIONS.forEach((act, i) => {
          if (i === 2 || i === 4) {
            const s = document.createElement("span"); s.className = "ql-tbl-toolbar-sep"; tblToolbar.appendChild(s);
          }
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "ql-tbl-action-btn" + (act.danger ? " danger" : "");
          btn.title = act.title;
          btn.innerHTML = act.icon;
          btn.addEventListener("mousedown", (e) => { e.preventDefault(); act.action(); });
          tblToolbar.appendChild(btn);
        });

        quill.on("selection-change", (range: { index: number; length: number } | null) => {
          if (!range) { tblToolbar.style.display = "none"; return; }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const [leaf] = (quill as any).getLeaf(range.index);
          let node: Node | null = leaf?.domNode ?? null;
          let td: HTMLTableCellElement | null = null;
          let tr: HTMLTableRowElement | null = null;
          let table: HTMLTableElement | null = null;
          while (node && node !== quill.root) {
            const el = node as HTMLElement;
            if (!td && (el.tagName === "TD" || el.tagName === "TH")) td = el as HTMLTableCellElement;
            if (!tr && el.tagName === "TR") tr = el as HTMLTableRowElement;
            if (!table && el.tagName === "TABLE") table = el as HTMLTableElement;
            node = el.parentElement;
          }
          curTable = table; curTr = tr; curTd = td;
          positionTblToolbar();
        });

        window.addEventListener("scroll", positionTblToolbar, true);
        window.addEventListener("resize", positionTblToolbar);

        // Cleanup both popover and toolbar when component unmounts
        const observer = new MutationObserver(() => {
          if (!document.body.contains(tableBtn)) {
            pop.remove(); tblToolbar.remove(); observer.disconnect();
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }

      // Drag-and-drop + paste — embed as data URL; upload happens on save.
      const editorEl = quill.root as HTMLElement;
      editorEl.addEventListener("drop", (e: DragEvent) => {
        const file = e.dataTransfer?.files?.[0];
        if (!file || !file.type.startsWith("image/")) return;
        e.preventDefault();
        e.stopPropagation();
        if (!validateImageFile(file)) return;
        (async () => {
          const dataUrl = await fileToDataUrl(file);
          insertImage(quill as unknown as EditorQuill, dataUrl);
        })();
      });
      // ── Document-level capture paste handler ────────────────────────────────
      // Runs in the capture phase, BEFORE Quill's own paste handler, so we can
      // call stopPropagation() and Quill never sees the event.
      // Handles: (1) image-file paste, (2) markdown table → HTML conversion.
      function onDocumentPaste(e: ClipboardEvent) {
        // Only handle pastes that target this editor instance
        if (!editorEl.contains(e.target as Node) && e.target !== editorEl) return;

        const items = e.clipboardData?.items;
        if (!items) return;

        // ── Image file ──────────────────────────────────────────────────────
        for (const it of Array.from(items)) {
          if (it.kind === "file" && it.type.startsWith("image/")) {
            const file = it.getAsFile();
            if (!file) continue;
            e.preventDefault();
            e.stopPropagation();
            (async () => {
              if (!validateImageFile(file)) return;
              const dataUrl = await fileToDataUrl(file);
              insertImage(quill as unknown as EditorQuill, dataUrl);
            })();
            return;
          }
        }

        // ── Markdown content ────────────────────────────────────────────────
        // Always prefer our markdown → HTML conversion when the plain-text
        // clipboard contains markdown syntax (headings, emphasis, lists, code,
        // quotes, links, tables), even if an HTML flavour is also present
        // (e.g. copying markdown source from VS Code or a rendered docs page).
        // Our converter produces consistent, clean HTML that Quill v2 renders
        // reliably.
        const textClip = e.clipboardData?.getData("text/plain") ?? "";
        if (looksLikeMarkdown(textClip)) {
          e.preventDefault();
          e.stopPropagation();
          const converted = convertMarkdownPaste(textClip);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const q = quill as any;
          const range = q.getSelection() ?? { index: q.getLength() };
          q.clipboard.dangerouslyPasteHTML(range.index, converted, "user");
        }
      }

      document.addEventListener("paste", onDocumentPaste, true);

      if (value) {
        quill.clipboard.dangerouslyPasteHTML(value);
        lastReportedValue.current = value;
        quill.history.clear();
      }

      quill.on("text-change", (_delta: unknown, _old: unknown, source: string) => {
        if (source !== "user") return;
        isInternalChange.current = true;
        // Replace &nbsp; that Quill injects for spaces so saved content wraps normally.
        const html = quill.getSemanticHTML().replace(/&nbsp;/g, " ").replace(/ /g, " ");
        lastReportedValue.current = html;
        onChangeRef.current(html);
        isInternalChange.current = false;
      });
    })();
  }, []); // intentional: initialize once on mount

  // Sync external value changes (form reset, PDF import, etc.). Skips when the
  // change originated from the editor itself, preventing an update loop.
  useEffect(() => {
    const quill = quillRef.current;
    if (!quill || isInternalChange.current) return;
    if (value === lastReportedValue.current) return;

    isInternalChange.current = true;
    if (value) {
      quill.setContents([{ insert: "\n" }]);
      quill.clipboard.dangerouslyPasteHTML(value);
    } else if (quill.getLength() > 1) {
      quill.setContents([{ insert: "\n" }]);
    }
    lastReportedValue.current = value;
    quill.history.clear();
    isInternalChange.current = false;
  }, [value]);

  return (
    <div className={cn("quill-editor-root", className)}>
      <div ref={containerRef} style={{ minHeight }} />
    </div>
  );
}
