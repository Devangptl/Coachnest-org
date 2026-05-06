/**
 * POST /api/instructor/lessons/extract-pdf
 *
 * Accepts a multipart/form-data PDF (field "file") and returns its text
 * content as Markdown. Headings, bold, italic, and bullet/numbered lists
 * are preserved by inspecting font metadata via pdfjs-dist. Falls back to
 * plain text if the structured extraction fails.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// Configure pdfjs once for the Node worker.
async function loadPdfjs() {
  const { pathToFileURL } = await import("url");
  const { getPath } = await import("pdf-parse/worker");
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(getPath()).href;
  return pdfjs;
}

interface Span {
  text:   string;
  size:   number;
  bold:   boolean;
  italic: boolean;
}
interface Line {
  y:       number;
  maxSize: number;
  spans:   Span[];
}

const BOLD_RE   = /bold|black|heavy|semibold|extrabold/i;
const ITALIC_RE = /italic|oblique/i;
const BULLET_RE = /^[•‣◦●○▪▫·⁃∙\-*]\s+(.*)$/;
const NUMBER_RE = /^(\d{1,3})[.)]\s+(.*)$/;

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function styleWrapHtml(text: string, bold: boolean, italic: boolean): string {
  let core = text;
  if (italic) core = `<em>${core}</em>`;
  if (bold)   core = `<strong>${core}</strong>`;
  return core;
}

function renderLineHtml(spans: Span[]): string {
  // Merge adjacent spans with identical styles for cleaner HTML
  const merged: Span[] = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && last.bold === s.bold && last.italic === s.italic) {
      last.text += s.text;
    } else {
      merged.push({ ...s });
    }
  }
  return merged
    .map((s) => styleWrapHtml(htmlEscape(s.text), s.bold, s.italic))
    .join("");
}

async function extractHtml(buffer: Buffer): Promise<string> {
  const pdfjs = await loadPdfjs();
  const data  = new Uint8Array(buffer);
  const doc   = await pdfjs.getDocument({ data, disableFontFace: true, useSystemFonts: false }).promise;

  const lines: Line[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc   = await page.getTextContent();
    const styles = tc.styles as Record<string, { fontFamily?: string }>;

    let current: Line | null = null;

    for (const it of tc.items as unknown[]) {
      const item = it as { str?: string; transform?: number[]; fontName?: string; hasEOL?: boolean };
      if (typeof item.str !== "string" || !item.transform) continue;

      if (item.str === "" && item.hasEOL) {
        if (current) { lines.push(current); current = null; }
        continue;
      }
      if (item.str === "") continue;

      const y    = item.transform[5];
      const size = Math.abs(item.transform[3]) || Math.abs(item.transform[0]) || 12;
      const fontName   = item.fontName ?? "";
      const fontFamily = styles[fontName]?.fontFamily ?? "";
      const tag    = `${fontFamily} ${fontName}`;
      const bold   = BOLD_RE.test(tag);
      const italic = ITALIC_RE.test(tag);

      if (!current || Math.abs(current.y - y) > 1.5) {
        if (current) lines.push(current);
        current = { y, maxSize: size, spans: [] };
      }
      current.maxSize = Math.max(current.maxSize, size);
      current.spans.push({ text: item.str, size, bold, italic });

      if (item.hasEOL) { lines.push(current); current = null; }
    }
    if (current) { lines.push(current); current = null; }

    // Page break → blank line marker
    lines.push({ y: 0, maxSize: 0, spans: [] });
  }

  const sizes = lines.filter((l) => l.spans.length).map((l) => l.maxSize).sort((a, b) => a - b);
  const body  = sizes.length ? sizes[Math.floor(sizes.length / 2)] : 12;

  const out: string[] = [];
  let listMode: "ul" | "ol" | null = null;
  const closeList = () => { if (listMode) { out.push(`</${listMode}>`); listMode = null; } };

  for (const line of lines) {
    if (!line.spans.length) { closeList(); continue; }

    const rendered = renderLineHtml(line.spans).replace(/\s+/g, " ").trim();
    if (!rendered) { closeList(); continue; }

    // Heading detection (font noticeably larger than body)
    let level = 0;
    if      (line.maxSize >= body * 1.6)  level = 1;
    else if (line.maxSize >= body * 1.35) level = 2;
    else if (line.maxSize >= body * 1.15) level = 3;

    if (level > 0) {
      closeList();
      out.push(`<h${level}>${rendered}</h${level}>`);
      continue;
    }

    // List detection — work on the un-styled trimmed plain text for matching,
    // then keep the styled HTML for the visible content.
    const plain = line.spans.map((s) => s.text).join("").trim();
    const bullet = plain.match(BULLET_RE);
    const numbered = plain.match(NUMBER_RE);

    if (bullet) {
      if (listMode !== "ul") { closeList(); out.push("<ul>"); listMode = "ul"; }
      const stripped = rendered.replace(/^([•‣◦●○▪▫·⁃∙\-*]\s+)/, "");
      out.push(`<li>${stripped}</li>`);
      continue;
    }
    if (numbered) {
      if (listMode !== "ol") { closeList(); out.push("<ol>"); listMode = "ol"; }
      const stripped = rendered.replace(/^(\d{1,3}[.)]\s+)/, "");
      out.push(`<li>${stripped}</li>`);
      continue;
    }

    closeList();
    out.push(`<p>${rendered}</p>`);
  }
  closeList();

  return out.join("\n").trim();
}

async function extractPlainHtml(buffer: Buffer): Promise<string> {
  await loadPdfjs();
  const { PDFParse } = await import("pdf-parse");
  const result = await new PDFParse({ data: buffer }).getText();
  const cleaned = result.text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  // Wrap plain paragraphs in <p>; treat blank lines as breaks between them.
  return cleaned
    .split(/\n{2,}/)
    .map((p) => `<p>${htmlEscape(p).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "INSTRUCTOR" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: "Invalid form data." }, { status: 400 }); }

  const file = formData.get("file");
  if (!file || typeof file === "string")
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (file.type !== "application/pdf")
    return NextResponse.json({ error: "Only PDF files are accepted." }, { status: 400 });
  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: "File too large (max 10 MB)." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());

  // Prefer style-aware HTML extraction; fall back to a plain-text → HTML
  // wrap if anything goes wrong so the import still succeeds.
  let content = "";
  try {
    content = await extractHtml(buffer);
  } catch (err) {
    console.warn("[extract-pdf] structured extraction failed, falling back:", err);
  }
  if (!content) {
    try {
      content = await extractPlainHtml(buffer);
    } catch (err) {
      console.error("[extract-pdf] plain-text extraction failed:", err);
      return NextResponse.json(
        { error: "Could not read the PDF. Make sure it contains selectable text (not a scanned image)." },
        { status: 422 },
      );
    }
  }

  if (!content) {
    return NextResponse.json(
      { error: "PDF contains no extractable text." },
      { status: 422 },
    );
  }

  return NextResponse.json({
    content,
    title: (file.name || "").replace(/\.pdf$/i, "").trim() || null,
    chars: content.length,
  });
}
