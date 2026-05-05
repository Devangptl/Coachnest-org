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

function styleWrap(text: string, bold: boolean, italic: boolean): string {
  if (!bold && !italic) return text;
  const m = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!m || !m[2]) return text;
  const [, lead, mid, trail] = m;
  let core = mid;
  if (bold && italic) core = `***${core}***`;
  else if (bold)      core = `**${core}**`;
  else if (italic)    core = `*${core}*`;
  return `${lead}${core}${trail}`;
}

function renderLine(spans: Span[]): string {
  // Merge adjacent spans with identical styles
  const merged: Span[] = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && last.bold === s.bold && last.italic === s.italic) {
      last.text += s.text;
    } else {
      merged.push({ ...s });
    }
  }
  return merged.map((s) => styleWrap(s.text, s.bold, s.italic)).join("");
}

async function extractMarkdown(buffer: Buffer): Promise<string> {
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

      // EOL marker with no text → flush current line
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

      // New line if Y jumped (tolerant for sub-pixel drift)
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

  // ── Determine body font size (median of non-empty lines) ───────────────────
  const sizes = lines.filter((l) => l.spans.length).map((l) => l.maxSize).sort((a, b) => a - b);
  const body  = sizes.length ? sizes[Math.floor(sizes.length / 2)] : 12;

  // ── Emit Markdown ──────────────────────────────────────────────────────────
  const out: string[] = [];
  const pushBlank = () => { if (out.length && out[out.length - 1] !== "") out.push(""); };

  for (const line of lines) {
    if (!line.spans.length) { pushBlank(); continue; }

    const rendered = renderLine(line.spans).replace(/\s+/g, " ").trim();
    if (!rendered) { pushBlank(); continue; }

    // Headings (font noticeably larger than body)
    let prefix = "";
    if      (line.maxSize >= body * 1.6)  prefix = "# ";
    else if (line.maxSize >= body * 1.35) prefix = "## ";
    else if (line.maxSize >= body * 1.15) prefix = "### ";

    // Lists (only when not a heading)
    if (!prefix) {
      const bullet = rendered.match(BULLET_RE);
      if (bullet) { out.push(`- ${bullet[1].trim()}`); continue; }
      const numbered = rendered.match(NUMBER_RE);
      if (numbered) { out.push(`${numbered[1]}. ${numbered[2].trim()}`); continue; }
    }

    if (prefix) pushBlank();
    out.push(prefix + rendered);
    if (prefix) out.push("");
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function extractPlainText(buffer: Buffer): Promise<string> {
  await loadPdfjs();
  const { PDFParse } = await import("pdf-parse");
  const result = await new PDFParse({ data: buffer }).getText();
  return result.text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
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

  // Prefer style-aware Markdown extraction; fall back to plain text on error.
  let content = "";
  try {
    content = await extractMarkdown(buffer);
  } catch (err) {
    console.warn("[extract-pdf] markdown extraction failed, falling back:", err);
  }
  if (!content) {
    try {
      content = await extractPlainText(buffer);
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
