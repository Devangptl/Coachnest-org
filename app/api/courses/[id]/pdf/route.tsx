import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

type Block =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "code"; lang: string; code: string }
  | { type: "list"; items: string[] }
  | { type: "numlist"; items: string[] }
  | { type: "paragraph"; text: string }
  | { type: "blockquote"; text: string }
  | { type: "hr" };

type Span = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  link?: string;
};

// Inline markdown: **bold**, *italic*, _italic_, `code`, [text](url)
function parseInline(text: string): Span[] {
  const spans: Span[] = [];
  const re =
    /(\*\*([\s\S]+?)\*\*|\*([^\s*][\s\S]*?[^\s*]|\S)\*|_([^\s_][\s\S]*?[^\s_]|\S)_|`([^`]+?)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) spans.push({ text: text.slice(last, m.index) });
    if (m[2] != null)      spans.push({ text: m[2], bold: true });
    else if (m[3] != null) spans.push({ text: m[3], italic: true });
    else if (m[4] != null) spans.push({ text: m[4], italic: true });
    else if (m[5] != null) spans.push({ text: m[5], code: true });
    else if (m[6] != null) spans.push({ text: m[6], link: m[7] });
    last = re.lastIndex;
  }
  if (last < text.length) spans.push({ text: text.slice(last) });
  return spans.length > 0 ? spans : [{ text }];
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([\s\S]+?)\*\*/g, "$1")
    .replace(/\*([\s\S]+?)\*/g, "$1")
    .replace(/_([\s\S]+?)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^[\s]*[-*+]\s+/gm, "")
    .replace(/^\d+[\.\)]\s+/gm, "")
    .replace(/^(-{3,}|\*{3,}|_{3,})$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseMdContent(raw: string): Block[] {
  const lines = raw.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trimStart().startsWith("```")) {
      const lang = line.trim().replace(/^```/, "").trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      blocks.push({ type: "code", lang: lang || "code", code: codeLines.join("\n") });
      continue;
    }

    if (line.startsWith("### ")) { blocks.push({ type: "h3", text: line.slice(4).trim() }); i++; continue; }
    if (line.startsWith("## "))  { blocks.push({ type: "h2", text: line.slice(3).trim() }); i++; continue; }
    if (line.startsWith("# "))   { blocks.push({ type: "h1", text: line.slice(2).trim() }); i++; continue; }

    // Horizontal rule: ---, ***, ___ (3+ chars on a line by themselves)
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Blockquote: contiguous lines starting with "> "
    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "blockquote", text: quoteLines.join(" ") });
      continue;
    }

    if (/^[\s]*[•\-\*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[\s]*[•\-\*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[\s]*[•\-\*]\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    if (/^\d+[\.\)]\s/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[\.\)]\s/.test(lines[i].trim())) {
        items.push(lines[i].replace(/^\s*\d+[\.\)]\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "numlist", items });
      continue;
    }

    if (line.trim() === "") { i++; continue; }

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith(">") &&
      !lines[i].trimStart().startsWith("```") &&
      !/^[\s]*[•\-\*]\s/.test(lines[i]) &&
      !/^\d+[\.\)]\s/.test(lines[i].trim()) &&
      !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) blocks.push({ type: "paragraph", text: paraLines.join(" ") });
  }

  return blocks;
}

// pdf-lib's StandardFonts (Helvetica/Courier) only encode WinAnsi (CP-1252).
// Any character outside that range -- e.g. Unicode minus (U+2212), CJK,
// emoji, zero-widths -- throws "WinAnsi cannot encode ..." on drawText.
// We rewrite common typography to ASCII equivalents and replace anything
// still outside CP-1252 with "?" so the PDF can always render.
const WINANSI_HIGH = new Set<number>([
  0x20AC, 0x201A, 0x0192, 0x201E, 0x2026, 0x2020, 0x2021, 0x02C6,
  0x2030, 0x0160, 0x2039, 0x0152, 0x017D, 0x2018, 0x2019, 0x201C,
  0x201D, 0x2022, 0x2013, 0x2014, 0x02DC, 0x2122, 0x0161, 0x203A,
  0x0153, 0x017E, 0x0178,
]);

function sanitize(s: string | null | undefined): string {
  if (!s) return "";
  let out = "";
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    if (cp <= 0x7F) { out += ch; continue; }                    // ASCII
    if (cp >= 0xA0 && cp <= 0xFF) { out += ch; continue; }      // Latin-1
    if (WINANSI_HIGH.has(cp)) { out += ch; continue; }          // CP-1252 high
    // Common substitutions
    if (cp === 0x2212 || cp === 0x2010 || cp === 0x2011 || cp === 0x2012) {
      out += "-"; continue;                                     // dashes/minus
    }
    if (cp === 0x2002 || cp === 0x2003 || cp === 0x2009 ||
        cp === 0x202F || cp === 0x205F || cp === 0x3000) {
      out += " "; continue;                                     // exotic spaces
    }
    if ((cp >= 0x200B && cp <= 0x200F) ||
        (cp >= 0x202A && cp <= 0x202E) ||
        cp === 0x2060 || cp === 0xFEFF) {
      continue;                                                 // zero-width / bidi: drop
    }
    out += "?";                                                 // unsupported
  }
  return out;
}

function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  if (!text) return [""];
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = words[0] ?? "";

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = font.widthOfTextAtSize(currentLine + " " + word, fontSize);
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

// ─── HTML content pipeline ────────────────────────────────────────────────────
// Quill editor saves content as HTML (starts with "<"). These helpers mirror
// the markdown pipeline so the PDF renders Quill content with identical fidelity.

function isHtmlContent(s: string): boolean {
  return typeof s === "string" && s.trimStart().startsWith("<");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ").replace(/ /g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_: string, n: string) => String.fromCharCode(Number(n)));
}

function stripHtmlTags(html: string): string {
  return sanitize(
    decodeEntities(html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, ""))
  ).trim();
}

// Convert inner HTML of a Quill block element → Span[] (bold / italic / code / link).
function parseHtmlInline(html: string): Span[] {
  const spans: Span[] = [];
  html = html.replace(/&nbsp;/g, " ").replace(/ /g, " ");
  const parts = html.split(/(<[^>]+?>)/g);
  const st = { bold: false, italic: false, code: false, link: null as string | null };
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("<")) {
      const isClose   = part.startsWith("</");
      const nameMatch = part.match(/^<\/?([a-z][a-z0-9]*)/i);
      if (!nameMatch) continue;
      const tag = nameMatch[1].toLowerCase();
      if      (tag === "strong" || tag === "b") st.bold   = !isClose;
      else if (tag === "em"     || tag === "i") st.italic = !isClose;
      else if (tag === "code")                  st.code   = !isClose;
      else if (tag === "a" && !isClose) {
        const m = part.match(/href="([^"]*)"/i) || part.match(/href='([^']*)'/i);
        st.link = m ? m[1] : null;
      }
      else if (tag === "a")  st.link = null;
      else if (tag === "br") spans.push({ text: " " });
    } else {
      const text = sanitize(decodeEntities(part));
      if (!text) continue;
      const span: Span = { text };
      if (st.bold)   span.bold   = true;
      if (st.italic) span.italic = true;
      if (st.code)   span.code   = true;
      if (st.link)   span.link   = st.link;
      spans.push(span);
    }
  }
  return spans.filter((s) => s.text);
}

// Parse Quill HTML → Block[]. block.text holds raw inner HTML so inline
// formatting survives into the PDF via parseHtmlInline().
function parseHtml(raw: string): Block[] {
  const blocks: Block[] = [];
  let i = 0;
  const len = raw.length;

  // Read inner content up to the matching close tag, updating outer i.
  const readUntilClose = (tag: string): string => {
    const closeTag = `</${tag}>`;
    const openRe   = new RegExp(`<${tag}[\\s>]`, "gi");
    let depth = 1, pos = i;
    while (pos < len && depth > 0) {
      const nc = raw.toLowerCase().indexOf(closeTag.toLowerCase(), pos);
      if (nc < 0) { i = len; return ""; }
      depth += (raw.slice(pos, nc).match(openRe) || []).length;
      depth--;
      if (depth === 0) { const c = raw.slice(i, nc); i = nc + closeTag.length; return c; }
      pos = nc + closeTag.length;
    }
    i = len;
    return "";
  };

  while (i < len) {
    while (i < len && /\s/.test(raw[i])) i++;
    if (i >= len) break;

    if (raw[i] !== "<") {
      const end  = raw.indexOf("<", i);
      const text = sanitize(decodeEntities(raw.slice(i, end < 0 ? len : end).trim()));
      if (text) blocks.push({ type: "paragraph", text });
      i = end < 0 ? len : end;
      continue;
    }

    const tagEnd    = raw.indexOf(">", i);
    if (tagEnd < 0) break;
    const openTag   = raw.slice(i, tagEnd + 1);
    const nameMatch = openTag.match(/^<([a-z][a-z0-9]*)/i);
    if (!nameMatch || openTag.startsWith("</")) { i = tagEnd + 1; continue; }

    const tag = nameMatch[1].toLowerCase();
    if (openTag.endsWith("/>") || tag === "hr" || tag === "br" || tag === "img") {
      if (tag === "hr") blocks.push({ type: "hr" });
      i = tagEnd + 1;
      continue;
    }

    i = tagEnd + 1;
    const inner = readUntilClose(tag);

    switch (tag) {
      case "h1": { const t = stripHtmlTags(inner); if (t) blocks.push({ type: "h1", text: inner.trim() }); break; }
      case "h2": { const t = stripHtmlTags(inner); if (t) blocks.push({ type: "h2", text: inner.trim() }); break; }
      case "h3":
      case "h4": { const t = stripHtmlTags(inner); if (t) blocks.push({ type: "h3", text: inner.trim() }); break; }
      case "p": {
        if (stripHtmlTags(inner)) blocks.push({ type: "paragraph", text: inner.trim() });
        break;
      }
      case "blockquote": {
        if (stripHtmlTags(inner)) blocks.push({ type: "blockquote", text: inner.trim() });
        break;
      }
      case "pre": {
        const code = sanitize(decodeEntities(inner.replace(/<[^>]+>/g, "")));
        if (code.trim()) blocks.push({ type: "code", lang: "code", code: code.trim() });
        break;
      }
      case "ul": {
        const items: string[] = [];
        const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
        let m: RegExpExecArray | null;
        while ((m = liRe.exec(inner)) !== null) {
          if (stripHtmlTags(m[1])) items.push(m[1].trim());
        }
        if (items.length) blocks.push({ type: "list", items });
        break;
      }
      case "ol": {
        const items: string[] = [];
        const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
        let m: RegExpExecArray | null;
        while ((m = liRe.exec(inner)) !== null) {
          if (stripHtmlTags(m[1])) items.push(m[1].trim());
        }
        if (items.length) blocks.push({ type: "numlist", items });
        break;
      }
      default: {
        const text = stripHtmlTags(inner);
        if (text) blocks.push({ type: "paragraph", text });
        break;
      }
    }
  }
  return blocks;
}

// Route to the correct inline parser based on content type.
// isHtmlContent() only checks the first character, so also detect HTML tags
// or entities anywhere in the string (e.g. Quill inner HTML like
// "When&nbsp;higher..." or "Some <strong>bold</strong> text").
function getSpans(text: string): Span[] {
  if (/<[a-z]/i.test(text) || /&(?:[a-z]+|#\d+);/.test(text)) {
    return parseHtmlInline(text);
  }
  return parseInline(text);
}

// Unified block parser — dispatches to HTML or Markdown pipeline.
function parseContent(raw: string): Block[] {
  return isHtmlContent(raw) ? parseHtml(raw) : parseMdContent(raw);
}

async function generateCoursePDF(course: any) {
  // Normalize every user-supplied string up front so no draw call ever sees
  // a character outside WinAnsi (CP-1252). Avoids "WinAnsi cannot encode"
  // crashes on lessons that contain typographic minus, CJK, emoji, etc.
  course = {
    ...course,
    title:       sanitize(course.title),
    description: course.description == null ? course.description : sanitize(course.description),
    level:       course.level == null       ? course.level       : sanitize(course.level),
    language:    course.language == null    ? course.language    : sanitize(course.language),
    createdBy:   course.createdBy
      ? { ...course.createdBy, name: sanitize(course.createdBy.name) }
      : course.createdBy,
    lessons: (course.lessons || []).map((l: any) => ({
      ...l,
      title:   sanitize(l.title),
      content: l.content == null ? l.content : sanitize(l.content),
    })),
  };

  const doc = await PDFDocument.create();

  const pageWidth  = 595.28;
  const pageHeight = 841.89;
  const margin     = 52;
  const usableW    = pageWidth - margin * 2;

  // Design tokens
  const orange   = rgb(0.976, 0.451, 0.086);
  const white    = rgb(1, 1, 1);
  const textDark = rgb(0.1, 0.1, 0.13);
  const textMid  = rgb(0.38, 0.38, 0.43);
  const textLight= rgb(0.6, 0.6, 0.65);
  const codeBg   = rgb(0.95, 0.95, 0.97);
  const codeText = rgb(0.1, 0.1, 0.45);
  const panelBg  = rgb(0.97, 0.97, 0.99);
  const divider  = rgb(0.87, 0.87, 0.90);

  const HEADER_H   = 36;
  const FOOTER_H   = 26;
  const contentTop = pageHeight - HEADER_H - 14;
  const contentBot = FOOTER_H + 14;

  const font        = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold    = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontMono    = await doc.embedFont(StandardFonts.Courier);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  // Embed site logo from /public/logo.png so the PDF matches the website branding
  let logoImage: Awaited<ReturnType<typeof doc.embedPng>> | null = null;
  try {
    const logoBytes = await readFile(path.join(process.cwd(), "public", "logo.png"));
    logoImage = await doc.embedPng(logoBytes);
  } catch {
    logoImage = null; // fall back to text branding if the file is missing
  }

  // Returns {width, height} for the logo scaled to a target height, preserving aspect ratio
  const logoSize = (targetHeight: number) => {
    if (!logoImage) return { width: 0, height: 0 };
    const ratio = logoImage.width / logoImage.height;
    return { width: targetHeight * ratio, height: targetHeight };
  };

  const instructorName = course.createdBy?.name || "Instructor";

  // ─── COVER PAGE ───────────────────────────────────────────────────────────
  const cover = doc.addPage([pageWidth, pageHeight]);

  // Full white background
  cover.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: white });

  // Orange left strip
  cover.drawRectangle({ x: 0, y: 0, width: 5, height: pageHeight, color: orange });

  // Orange top strip
  cover.drawRectangle({ x: 5, y: pageHeight - 5, width: pageWidth - 5, height: 5, color: orange });

  // Bottom-right corner accents (decorative)
  cover.drawRectangle({ x: pageWidth - 130, y: 32, width: 95, height: 3, color: orange, opacity: 0.3 });
  cover.drawRectangle({ x: pageWidth - 35,  y: 32, width: 3, height: 100, color: orange, opacity: 0.3 });

  // "COURSE MATERIAL" label
  cover.drawText("COURSE MATERIAL", {
    x: margin + 12, y: pageHeight - 70,
    size: 9, font: fontBold, color: orange,
  });

  // Thin rule
  cover.drawRectangle({ x: margin + 12, y: pageHeight - 84, width: usableW - 12, height: 0.5, color: divider });

  // Course title
  let coverY = pageHeight - 150;
  const titleLines = wrapText(course.title, usableW - 12, fontBold, 28);
  for (const line of titleLines) {
    cover.drawText(line, { x: margin + 12, y: coverY, size: 28, font: fontBold, color: textDark });
    coverY -= 36;
  }

  // Orange accent bar
  cover.drawRectangle({ x: margin + 12, y: coverY, width: 72, height: 3, color: orange });
  coverY -= 26;

  // Description (strip markdown for clean cover display)
  if (course.description) {
    const plainDesc = isHtmlContent(course.description)
      ? stripHtmlTags(course.description)
      : sanitize(stripMarkdown(course.description));
    const descLines = wrapText(plainDesc, usableW - 12, font, 11);
    for (const line of descLines.slice(0, 6)) {
      cover.drawText(line, { x: margin + 12, y: coverY, size: 11, font, color: textMid });
      coverY -= 17;
    }
    coverY -= 6;
  }

  // Meta chips
  const metaParts: string[] = [`${course.lessons.length} Lessons`];
  if (course.level)    metaParts.push(course.level.charAt(0).toUpperCase() + course.level.slice(1) + " Level");
  if (course.language) metaParts.push(course.language);
  cover.drawText(metaParts.join("  ·  "), { x: margin + 12, y: coverY, size: 9.5, font, color: textMid });

  // Bottom divider
  cover.drawRectangle({ x: margin + 12, y: 130, width: usableW - 12, height: 0.5, color: divider });

  // Instructor info
  cover.drawText("INSTRUCTOR", { x: margin + 12, y: 114, size: 7.5, font: fontBold, color: textMid });
  cover.drawText(instructorName, { x: margin + 12, y: 92, size: 15, font: fontBold, color: textDark });

  // Site logo (replaces former "LearnHub" wordmark)
  if (logoImage) {
    const { width: logoW, height: logoH } = logoSize(28);
    cover.drawImage(logoImage, {
      x: pageWidth - margin - logoW,
      y: 88,
      width: logoW,
      height: logoH,
      opacity: 0.95,
    });
  }
  const subW = font.widthOfTextAtSize("Learning Platform", 8.5);
  cover.drawText("Learning Platform", { x: pageWidth - margin - subW, y: 75, size: 8.5, font, color: rgb(0.38, 0.38, 0.44) });

  // Generated date
  const genDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  cover.drawText(`Generated ${genDate}`, { x: margin + 12, y: 50, size: 8, font, color: textMid });

  // ─── CONTENT PAGES ────────────────────────────────────────────────────────
  const lessonPageIndices: number[] = [];

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = contentTop;

  const newPage = () => {
    page = doc.addPage([pageWidth, pageHeight]);
    y = contentTop;
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < contentBot) newPage();
  };

  // ── Vertical rhythm tokens ───────────────────────────────────────────────
  // Centralized so spacing stays consistent across every block type.
  // Convention: each block consumes its OWN trailing gap so the next block
  // starts directly. The "before" gaps below are only for blocks that need
  // extra breathing room above (headings, code, quotes, hr).
  const SP = {
    beforeH1:     20,
    beforeH2:     16,
    beforeH3:     12,
    afterHeading:  6,
    afterPara:    10,
    listItemGap:   4,
    afterList:     8,
    beforeCode:   12,
    afterCode:    14,
    beforeQuote:  10,
    afterQuote:   10,
    hrAbove:      14,
    hrBelow:      14,
    lessonGap:    32,
    afterLessonHeader: 16,
  };

  // Render markdown spans with per-token font/colour, wrapping at usableW.
  // Supports bold, italic, inline code, and underlined links.
  const drawRichSpans = (
    spans: Span[],
    baseFont: any,
    baseSize: number,
    baseColor: any,
    indent = 0,
  ) => {
    if (spans.length === 0) return;

    // Body text uses ~1.55 leading; headings stay tighter (~1.3) for impact.
    const lineH  = baseSize >= 13 ? baseSize + 4 : baseSize + 6;
    const startX = margin + indent;
    const maxW   = usableW - indent;

    type Tok = {
      text: string;
      isSpace: boolean;
      font: any;
      size: number;
      color: any;
      underline: boolean;
      w: number;
    };
    const toks: Tok[] = [];

    for (const span of spans) {
      let f = baseFont;
      if (span.code) f = fontMono;
      else if (span.bold) f = fontBold;
      else if (span.italic) f = fontOblique;
      const sz    = span.code ? Math.max(baseSize - 0.5, 8) : baseSize;
      const color = span.link ? orange : (span.code ? codeText : baseColor);

      for (const piece of span.text.split(/(\s+)/)) {
        if (!piece) continue;
        const isSpace = /^\s+$/.test(piece);
        toks.push({
          text: piece,
          isSpace,
          font: f,
          size: sz,
          color,
          underline: !!span.link && !isSpace,
          w: f.widthOfTextAtSize(piece, sz),
        });
      }
    }

    let lineToks: Tok[] = [];
    let lineW = 0;

    const flushLine = () => {
      while (lineToks.length > 0 && lineToks[lineToks.length - 1].isSpace) lineToks.pop();
      if (lineToks.length === 0) { y -= lineH; return; }
      if (y - baseSize < contentBot) newPage();
      let cx = startX;
      for (const t of lineToks) {
        page.drawText(t.text, { x: cx, y, size: t.size, font: t.font, color: t.color });
        if (t.underline) {
          page.drawRectangle({ x: cx, y: y - 1.5, width: t.w, height: 0.5, color: t.color, opacity: 0.7 });
        }
        cx += t.w;
      }
      y -= lineH;
      lineToks = [];
      lineW = 0;
    };

    for (const t of toks) {
      if (t.isSpace && lineToks.length === 0) continue; // skip leading whitespace
      if (lineW + t.w > maxW && lineToks.length > 0) {
        flushLine();
        if (t.isSpace) continue;
      }
      lineToks.push(t);
      lineW += t.w;
    }
    if (lineToks.length > 0) flushLine();
  };

  // ── Course Overview (markdown-rendered description) ──────────────────────
  if (course.description) {
    ensureSpace(60);

    // Section header
    page.drawRectangle({ x: margin, y: y - 34 + 4, width: usableW, height: 34 - 4, color: rgb(0.97, 0.97, 0.99) });
    page.drawRectangle({ x: margin, y: y - 34 + 4, width: 3, height: 34 - 4, color: orange });
    page.drawRectangle({ x: margin, y: y - 34 + 3, width: usableW, height: 0.5, color: divider });
    page.drawText("COURSE OVERVIEW", { x: margin + 10, y: y - 15, size: 10, font: fontBold, color: orange });
    y -= 34;
    page.drawRectangle({ x: margin, y, width: usableW, height: 0.5, color: divider });
    y -= SP.afterLessonHeader;

    const descBlocks = parseContent(course.description);
    for (const block of descBlocks) {
      switch (block.type) {
        case "h1":
          y -= SP.beforeH1; ensureSpace(28);
          drawRichSpans(getSpans(block.text), fontBold, 15, rgb(0.05, 0.05, 0.10));
          y -= SP.afterHeading;
          break;
        case "h2":
          y -= SP.beforeH2; ensureSpace(24);
          drawRichSpans(getSpans(block.text), fontBold, 13, textDark);
          y -= SP.afterHeading;
          break;
        case "h3":
          y -= SP.beforeH3; ensureSpace(20);
          drawRichSpans(getSpans(block.text), fontBold, 11, textMid);
          y -= SP.afterHeading;
          break;
        case "paragraph":
          drawRichSpans(getSpans(block.text), font, 10.5, textDark);
          y -= SP.afterPara;
          break;
        case "blockquote": {
          y -= SP.beforeQuote; ensureSpace(24);
          const quoteIndent = 18;
          const startY = y + 4;
          drawRichSpans(getSpans(block.text), fontOblique, 10.5, textMid, quoteIndent);
          const endY = y + 4;
          page.drawRectangle({ x: margin + 4, y: endY, width: 2, height: Math.max(startY - endY, 12), color: orange, opacity: 0.7 });
          y -= SP.afterQuote;
          break;
        }
        case "hr":
          y -= SP.hrAbove; ensureSpace(12);
          page.drawRectangle({ x: margin, y, width: usableW, height: 0.5, color: divider });
          y -= SP.hrBelow;
          break;
        case "code": {
          y -= SP.beforeCode;
          const codeLines = block.code.split("\n");
          const hasLabel = block.lang && block.lang !== "code";
          const langH = hasLabel ? 14 : 0;
          const blockH = 10 + langH + codeLines.length * 12 + 10;
          const pageH = contentTop - contentBot;
          if (blockH <= pageH && y - blockH < contentBot) newPage();
          if (y - blockH >= contentBot) {
            page.drawRectangle({ x: margin, y: y - blockH, width: usableW, height: blockH, color: codeBg });
            page.drawRectangle({ x: margin, y: y - blockH, width: 3, height: blockH, color: orange, opacity: 0.65 });
          }
          y -= 10;
          if (hasLabel) {
            if (y < contentBot) newPage();
            page.drawText(block.lang.toUpperCase(), { x: margin + 10, y, size: 7.5, font: fontBold, color: orange });
            y -= 14;
          }
          for (const codeLine of codeLines) {
            if (y - 12 < contentBot) newPage();
            page.drawText(codeLine || " ", { x: margin + 10, y, size: 9.5, font: fontMono, color: codeText });
            y -= 12;
          }
          y -= SP.afterCode;
          break;
        }
        case "list":
          for (const item of block.items) {
            ensureSpace(20);
            page.drawText("•", { x: margin + 10, y, size: 10, font, color: orange });
            drawRichSpans(getSpans(item), font, 10.5, textDark, 22);
            y -= SP.listItemGap;
          }
          y -= SP.afterList - SP.listItemGap;
          break;
        case "numlist":
          block.items.forEach((item, idx) => {
            ensureSpace(20);
            page.drawText(`${idx + 1}.`, { x: margin + 8, y, size: 10.5, font: fontBold, color: orange });
            drawRichSpans(getSpans(item), font, 10.5, textDark, 22);
            y -= SP.listItemGap;
          });
          y -= SP.afterList - SP.listItemGap;
          break;
      }
    }

    y -= SP.lessonGap;
  }

  // ── Lessons ──────────────────────────────────────────────────────────────
  const headerH = 38;
  for (let i = 0; i < course.lessons.length; i++) {
    const lesson = course.lessons[i];

    // Reserve a comfortable amount of room so a lesson header doesn't strand
    // alone at the bottom of a page.
    ensureSpace(headerH + SP.afterLessonHeader + 60);
    lessonPageIndices.push(doc.getPageCount() - 1);

    if (lessonPageIndices[i] !== doc.getPageCount() - 1) {
      lessonPageIndices[i] = doc.getPageCount() - 1;
    }

    // Light accent background for lesson header
    page.drawRectangle({ x: margin, y: y - headerH + 4, width: usableW, height: headerH - 4, color: rgb(0.97, 0.97, 0.99) });
    page.drawRectangle({ x: margin, y: y - headerH + 4, width: 3, height: headerH - 4, color: orange });
    page.drawRectangle({ x: margin, y: y - headerH + 3, width: usableW, height: 0.5, color: divider });

    // Lesson number badge
    const numStr = String(i + 1).padStart(2, "0");
    page.drawText(numStr, { x: margin + 10, y: y - 11, size: 10, font: fontBold, color: orange });

    // Lesson title
    const ltLines = wrapText(lesson.title, usableW - 48, fontBold, 13);
    let ltY = y - 8;
    for (const ltLine of ltLines) {
      page.drawText(ltLine, { x: margin + 36, y: ltY, size: 13, font: fontBold, color: textDark });
      ltY -= 17;
    }

    y -= headerH;

    // Separator + breathing room before the lesson body
    page.drawRectangle({ x: margin, y, width: usableW, height: 0.5, color: divider });
    y -= SP.afterLessonHeader;

    if (!lesson.content) {
      page.drawText("No text content available for this lesson.", { x: margin, y, size: 10, font: fontOblique, color: textLight });
      y -= 24;
      continue;
    }

    const blocks = parseContent(lesson.content);

    for (const block of blocks) {
      switch (block.type) {
        case "h1":
          y -= SP.beforeH1; ensureSpace(28);
          drawRichSpans(getSpans(block.text), fontBold, 15, rgb(0.05, 0.05, 0.10));
          y -= SP.afterHeading;
          break;
        case "h2":
          y -= SP.beforeH2; ensureSpace(24);
          drawRichSpans(getSpans(block.text), fontBold, 13, textDark);
          y -= SP.afterHeading;
          break;
        case "h3":
          y -= SP.beforeH3; ensureSpace(20);
          drawRichSpans(getSpans(block.text), fontBold, 11, textMid);
          y -= SP.afterHeading;
          break;
        case "paragraph":
          drawRichSpans(getSpans(block.text), font, 10.5, textDark);
          y -= SP.afterPara;
          break;
        case "blockquote": {
          y -= SP.beforeQuote; ensureSpace(24);
          const quoteIndent = 18;
          const startY = y + 4;
          drawRichSpans(getSpans(block.text), fontOblique, 10.5, textMid, quoteIndent);
          // Left orange bar spanning the rendered block
          const endY = y + 4;
          page.drawRectangle({
            x: margin + 4,
            y: endY,
            width: 2,
            height: Math.max(startY - endY, 12),
            color: orange,
            opacity: 0.7,
          });
          y -= SP.afterQuote;
          break;
        }
        case "hr":
          y -= SP.hrAbove; ensureSpace(12);
          page.drawRectangle({ x: margin, y, width: usableW, height: 0.5, color: divider });
          y -= SP.hrBelow;
          break;
        case "code": {
          y -= SP.beforeCode;
          const codeLines = block.code.split("\n");
          const hasLabel  = block.lang && block.lang !== "code";
          const langH     = hasLabel ? 14 : 0;
          const blockH    = 10 + langH + codeLines.length * 12 + 10;

          const pageH = contentTop - contentBot;
          if (blockH <= pageH && y - blockH < contentBot) newPage();

          // Draw background only when block fits on one page
          if (y - blockH >= contentBot) {
            page.drawRectangle({ x: margin, y: y - blockH, width: usableW, height: blockH, color: codeBg });
            page.drawRectangle({ x: margin, y: y - blockH, width: 3,     height: blockH, color: orange, opacity: 0.65 });
          }

          y -= 10;

          if (hasLabel) {
            if (y < contentBot) newPage();
            page.drawText(block.lang.toUpperCase(), { x: margin + 10, y, size: 7.5, font: fontBold, color: orange });
            y -= 14;
          }

          for (const codeLine of codeLines) {
            if (y - 12 < contentBot) newPage();
            page.drawText(codeLine || " ", { x: margin + 10, y, size: 9.5, font: fontMono, color: codeText });
            y -= 12;
          }

          y -= SP.afterCode;
          break;
        }
        case "list":
          for (const item of block.items) {
            ensureSpace(20);
            page.drawText("•", { x: margin + 10, y, size: 10, font, color: orange });
            drawRichSpans(getSpans(item), font, 10.5, textDark, 22);
            y -= SP.listItemGap;
          }
          y -= SP.afterList - SP.listItemGap;
          break;
        case "numlist":
          block.items.forEach((item, idx) => {
            ensureSpace(20);
            page.drawText(`${idx + 1}.`, { x: margin + 8, y, size: 10.5, font: fontBold, color: orange });
            drawRichSpans(getSpans(item), font, 10.5, textDark, 22);
            y -= SP.listItemGap;
          });
          y -= SP.afterList - SP.listItemGap;
          break;
      }
    }

    y -= SP.lessonGap;
  }

  // ─── TABLE OF CONTENTS (inserted at page index 1) ─────────────────────────
  // Content pages are currently: cover=0, content=1+
  // After inserting TOC at 1: cover=0, toc=1, content=2+
  // So lessonPageIndices[i] + 2 = 1-based page number for TOC display.

  const tocPage = doc.insertPage(1, [pageWidth, pageHeight]);

  // TOC header bar
  tocPage.drawRectangle({ x: 0, y: pageHeight - 62, width: pageWidth, height: 62, color: panelBg });
  tocPage.drawRectangle({ x: 0, y: pageHeight - 62, width: 3,         height: 62, color: orange });
  tocPage.drawRectangle({ x: 0, y: pageHeight - 62, width: pageWidth, height: 0.5, color: divider });
  tocPage.drawText("Table of Contents", { x: margin, y: pageHeight - 36, size: 19, font: fontBold, color: textDark });
  tocPage.drawText(course.title, { x: margin, y: pageHeight - 54, size: 9, font, color: textMid });
  if (logoImage) {
    const { width: tocLogoW, height: tocLogoH } = logoSize(18);
    tocPage.drawImage(logoImage, {
      x: pageWidth - margin - tocLogoW,
      y: pageHeight - 42,
      width: tocLogoW,
      height: tocLogoH,
    });
  }

  // TOC rows
  let tocY    = pageHeight - 84;
  const rowH  = 25;
  const tocBt = FOOTER_H + 18;

  course.lessons.forEach((lesson: any, i: number) => {
    if (tocY < tocBt) return;

    if (i % 2 === 0) {
      tocPage.drawRectangle({ x: margin - 8, y: tocY - 8, width: usableW + 16, height: rowH, color: rgb(0.975, 0.975, 0.985) });
    }

    // Lesson number
    tocPage.drawText(String(i + 1).padStart(2, "0"), { x: margin, y: tocY + 5, size: 9, font: fontBold, color: orange });

    // Lesson title
    const maxTitleW  = usableW - 60;
    const truncTitle = lesson.title.length > 68 ? lesson.title.slice(0, 65) + "…" : lesson.title;
    tocPage.drawText(truncTitle, { x: margin + 28, y: tocY + 5, size: 9.5, font, color: textDark });

    // Dot leaders
    const titleEndX = margin + 28 + font.widthOfTextAtSize(truncTitle, 9.5);
    const pgNumX    = pageWidth - margin - 26;
    let dotX = titleEndX + 6;
    while (dotX + 5 < pgNumX - 8) {
      tocPage.drawText(".", { x: dotX, y: tocY + 5, size: 9, font, color: rgb(0.76, 0.76, 0.80) });
      dotX += 5.5;
    }

    // Page number
    const pgNum  = String(lessonPageIndices[i] + 2);
    const pgNumW = fontBold.widthOfTextAtSize(pgNum, 9);
    tocPage.drawText(pgNum, { x: pageWidth - margin - pgNumW, y: tocY + 5, size: 9, font: fontBold, color: textDark });

    tocY -= rowH;
  });

  // ─── WATERMARK + HEADERS + FOOTERS (all pages) ────────────────────────────
  // Use the site logo as a faint diagonal watermark to match the website
  const wmTargetW = 320;
  const wmH = logoImage ? wmTargetW * (logoImage.height / logoImage.width) : 0;
  const wmAngle = 35;
  const wmRad   = (wmAngle * Math.PI) / 180;
  // Position the rotated logo so its visual centre lands at the page centre
  const wmX = pageWidth  / 2 - (wmTargetW / 2) * Math.cos(wmRad) + (wmH / 2) * Math.sin(wmRad);
  const wmY = pageHeight / 2 - (wmTargetW / 2) * Math.sin(wmRad) - (wmH / 2) * Math.cos(wmRad);

  const allPages = doc.getPages();
  const total    = allPages.length;

  allPages.forEach((p: any, idx: number) => {
    // Diagonal logo watermark (skips when the logo failed to load)
    if (logoImage) {
      p.drawImage(logoImage, {
        x: wmX, y: wmY,
        width:  wmTargetW,
        height: wmH,
        rotate: degrees(wmAngle),
        opacity: idx === 0 ? 0.05 : 0.06,
      });
    }

    if (idx === 0) return; // Cover has its own full design

    // ── Footer ──────────────────────────────────────────────────────────────
    p.drawRectangle({ x: 0, y: 0, width: pageWidth, height: FOOTER_H, color: panelBg });
    p.drawRectangle({ x: 0, y: FOOTER_H, width: pageWidth, height: 0.5, color: divider });
    p.drawRectangle({ x: 0, y: 0, width: 3, height: FOOTER_H, color: orange });
    const pgTxt = `Page ${idx + 1} of ${total}`;
    const pgW   = font.widthOfTextAtSize(pgTxt, 8);
    p.drawText(pgTxt, { x: (pageWidth - pgW) / 2, y: 8, size: 8, font, color: textLight });
    p.drawText(`© ${instructorName}`, { x: margin, y: 8, size: 7.5, font, color: textLight });

    // ── Header (content pages only; TOC at idx=1 has its own) ───────────────
    if (idx >= 2) {
      p.drawRectangle({ x: 0, y: pageHeight - HEADER_H, width: pageWidth, height: HEADER_H, color: panelBg });
      p.drawRectangle({ x: 0, y: pageHeight - HEADER_H, width: pageWidth, height: 0.5, color: divider });
      p.drawRectangle({ x: 0, y: pageHeight - HEADER_H, width: 3, height: HEADER_H, color: orange });
      const hTitle = course.title.length > 60 ? course.title.slice(0, 57) + "…" : course.title;
      p.drawText(hTitle, { x: margin, y: pageHeight - HEADER_H + 13, size: 9, font, color: textMid });
      if (logoImage) {
        const { width: hdrLogoW, height: hdrLogoH } = logoSize(14);
        p.drawImage(logoImage, {
          x: pageWidth - margin - hdrLogoW,
          y: pageHeight - HEADER_H + 11,
          width: hdrLogoW,
          height: hdrLogoH,
        });
      }
    }
  });

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: courseId } = await params;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        lessons:   { orderBy: { order: "asc" } },
        createdBy: { select: { name: true } },
      },
    });

    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    const isPrivileged = session.role === "ADMIN" || session.role === "INSTRUCTOR";

    if (!isPrivileged) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: session.userId, courseId } },
      });
      if (!enrollment) return NextResponse.json({ error: "Forbidden: Not enrolled" }, { status: 403 });
    }

    const pdfBuffer = await generateCoursePDF(course);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="course-${course.slug || courseId}.pdf"`,
      },
    });
  } catch (err: unknown) {
    console.error("PDF Generation Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
