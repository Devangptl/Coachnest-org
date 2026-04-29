/**
 * GET /api/instructor/courses/template
 * Generates a professional branded course-creation template PDF.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFileSync } from "fs";
import { join } from "path";

// ── Layout constants ────────────────────────────────────────────────────────
const PAGE_W   = 595.28;
const PAGE_H   = 841.89;
const MARGIN   = 44;
const C_WIDTH  = PAGE_W - MARGIN * 2;

// ── Brand colours ───────────────────────────────────────────────────────────
const ORANGE       = rgb(0.976, 0.451, 0.086);   // #f97316
const ORANGE_DARK  = rgb(0.859, 0.294, 0.004);   // #db4b01
const ORANGE_LIGHT = rgb(1.000, 0.949, 0.918);   // #fff2ea
const ORANGE_MID   = rgb(0.992, 0.847, 0.773);   // #fdd8c5

const INK          = rgb(0.082, 0.082, 0.082);   // #151515
const INK_MED      = rgb(0.300, 0.300, 0.300);   // #4d4d4d
const INK_SOFT     = rgb(0.530, 0.530, 0.530);   // #878787
const BORDER       = rgb(0.871, 0.871, 0.871);   // #dedede
const BG_ROW_ALT   = rgb(0.973, 0.973, 0.973);   // #f8f8f8
const BG_LESSON    = rgb(0.992, 0.984, 0.976);   // #fdfaf9
const WHITE        = rgb(1, 1, 1);

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "INSTRUCTOR" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const doc      = await PDFDocument.create();
  const bold     = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular  = await doc.embedFont(StandardFonts.Helvetica);
  const mono     = await doc.embedFont(StandardFonts.Courier);
  const monoBold = await doc.embedFont(StandardFonts.CourierBold);

  // Embed logo
  const logoBuf  = readFileSync(join(process.cwd(), "public", "logo.png"));
  const logoImg  = await doc.embedPng(logoBuf);
  const LOGO_W   = 130;
  const LOGO_H   = LOGO_W * (logoImg.height / logoImg.width);

  let page    = doc.addPage([PAGE_W, PAGE_H]);
  let y       = PAGE_H;
  let pageNum = 1;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const newPage = () => {
    drawFooter();
    page    = doc.addPage([PAGE_W, PAGE_H]);
    pageNum++;
    y = PAGE_H - 32;
  };

  const need = (h: number) => {
    if (y - h < MARGIN + 24) newPage();
  };

  const gap = (n = 8) => { y -= n; };

  /** Horizontal rule */
  const hline = (x = MARGIN, w = C_WIDTH, thickness = 0.5, col = BORDER) => {
    page.drawLine({ start: { x, y: y + 1 }, end: { x: x + w, y: y + 1 }, thickness, color: col });
    y -= 2;
  };

  /** Plain text line */
  const text = (
    str: string,
    size: number,
    font = regular,
    color = INK,
    x = MARGIN,
    maxW = C_WIDTH,
  ) => {
    need(size + 5);
    page.drawText(str, { x, y, size, font, color, maxWidth: maxW });
    y -= size + 5;
  };

  /** Mono line (for template fields) */
  const mono_line = (str: string, size = 9.5, color = INK, x = MARGIN) => {
    need(size + 5);
    page.drawText(str, { x, y, size, font: mono, color, maxWidth: C_WIDTH - (x - MARGIN) });
    y -= size + 5;
  };

  // ── Section heading with left accent bar ─────────────────────────────────
  const sectionHead = (label: string) => {
    gap(12);
    need(22);
    // Left orange accent bar
    page.drawRectangle({ x: MARGIN, y: y - 3, width: 3, height: 18, color: ORANGE });
    page.drawText(label, {
      x: MARGIN + 10,
      y,
      size: 10,
      font: bold,
      color: INK,
    });
    y -= 14;
    hline(MARGIN + 10, C_WIDTH - 10, 0.5, BORDER);
    gap(6);
  };

  // ── Filled row background (for course fields) ─────────────────────────────
  const fieldRow = (key: string, value: string, isAlt: boolean) => {
    const ROW_H = 16;
    need(ROW_H + 2);

    if (isAlt) {
      page.drawRectangle({ x: MARGIN - 2, y: y - 4, width: C_WIDTH + 4, height: ROW_H + 2, color: BG_ROW_ALT });
    }

    const keyLabel = `${key}: `;
    const kw = monoBold.widthOfTextAtSize(keyLabel, 9);
    page.drawText(keyLabel, { x: MARGIN + 4, y, size: 9, font: monoBold, color: ORANGE_DARK });
    page.drawText(value,    { x: MARGIN + 4 + kw, y, size: 9, font: mono, color: INK_MED, maxWidth: C_WIDTH - kw - 8 });
    y -= ROW_H;
  };

  // ── Draw footer (call before newPage) ────────────────────────────────────
  const drawFooter = () => {
    const fy = MARGIN - 8;
    page.drawLine({ start: { x: MARGIN, y: fy + 10 }, end: { x: PAGE_W - MARGIN, y: fy + 10 }, thickness: 0.4, color: BORDER });
    page.drawText("CoachNest  -  Course Creation Template", { x: MARGIN, y: fy, size: 7, font: regular, color: INK_SOFT });
    const pLabel = `Page ${pageNum}`;
    const pw = regular.widthOfTextAtSize(pLabel, 7);
    page.drawText(pLabel, { x: PAGE_W - MARGIN - pw, y: fy, size: 7, font: regular, color: INK_SOFT });
  };

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 1 — Header band
  // ════════════════════════════════════════════════════════════════════════════

  // Orange header rectangle
  const HEADER_H = 72;
  page.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: HEADER_H, color: ORANGE });
  // Subtle darker bottom strip
  page.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: 3, color: ORANGE_DARK });

  // Logo (white tint via opacity trick — draw on orange bg)
  page.drawImage(logoImg, {
    x: MARGIN,
    y: PAGE_H - HEADER_H + (HEADER_H - LOGO_H) / 2,
    width: LOGO_W,
    height: LOGO_H,
    opacity: 0.92,
  });

  // "COURSE CREATION TEMPLATE" right-aligned in header
  const tagLabel = "COURSE CREATION TEMPLATE";
  const tagW = bold.widthOfTextAtSize(tagLabel, 9.5);
  page.drawText(tagLabel, {
    x: PAGE_W - MARGIN - tagW,
    y: PAGE_H - HEADER_H / 2 - 4,
    size: 9.5,
    font: bold,
    color: WHITE,
    opacity: 0.92,
  });

  y = PAGE_H - HEADER_H - 22;

  // ── HOW TO USE ────────────────────────────────────────────────────────────
  sectionHead("HOW TO USE THIS TEMPLATE");

  const steps = [
    "Open the template in any text editor (VS Code, Notepad, TextEdit, etc.).",
    "Replace every value after the colon with your own content.",
    "Add or duplicate LESSON blocks for each lesson in your course.",
    "Save the file, then export / print-to-PDF  (File > Print > Save as PDF).",
    "Upload the PDF on the CoachNest  Import Course  page.",
  ];

  for (let i = 0; i < steps.length; i++) {
    need(16);
    const num = `${i + 1}`;
    page.drawText(num, { x: MARGIN + 4, y, size: 8.5, font: bold, color: ORANGE });
    page.drawText(steps[i], { x: MARGIN + 16, y, size: 8.5, font: regular, color: INK_MED, maxWidth: C_WIDTH - 16 });
    y -= 14;
  }

  gap(10);

  // ── Quick-reference chips ─────────────────────────────────────────────────
  need(36);
  const chips: [string, string][] = [
    ["LEVEL",           "beginner  |  intermediate  |  advanced"],
    ["LESSON_TYPE",     "TEXT  |  VIDEO"],
    ["PRICE",           "0 = free course,  any number = paid (e.g. 29.99)"],
    ["LESSON_IS_FREE",  "yes  |  no"],
  ];

  // Light info box
  const boxTop = y + 14;
  const boxH   = chips.length * 14 + 14;
  page.drawRectangle({ x: MARGIN, y: y - boxH + 14, width: C_WIDTH, height: boxH, color: ORANGE_LIGHT, borderColor: ORANGE_MID, borderWidth: 0.6 });

  page.drawText("QUICK REFERENCE", { x: MARGIN + 8, y: boxTop - 2, size: 7.5, font: bold, color: ORANGE_DARK });
  y = boxTop - 14;

  for (const [key, val] of chips) {
    need(14);
    const kw = monoBold.widthOfTextAtSize(`${key}: `, 8);
    page.drawText(`${key}: `, { x: MARGIN + 8, y, size: 8, font: monoBold, color: INK });
    page.drawText(val,         { x: MARGIN + 8 + kw, y, size: 8, font: mono, color: INK_MED });
    y -= 14;
  }

  gap(6);

  // ════════════════════════════════════════════════════════════════════════════
  // COURSE INFORMATION
  // ════════════════════════════════════════════════════════════════════════════
  sectionHead("COURSE INFORMATION");

  const courseFields: [string, string][] = [
    ["COURSE_TITLE",  "[Your course title]"],
    ["SHORT_DESC",    "[Brief tagline - max 140 chars]"],
    ["DESCRIPTION",  "[Full course description. May span multiple lines.]"],
    ["LEVEL",        "beginner"],
    ["LANGUAGE",     "English"],
    ["PRICE",        "0"],
    ["CATEGORY",     "[Category name or leave blank]"],
    ["TAGS",         "[tag1, tag2, tag3]"],
  ];

  for (let i = 0; i < courseFields.length; i++) {
    fieldRow(courseFields[i][0], courseFields[i][1], i % 2 === 1);
  }

  gap(4);

  // ════════════════════════════════════════════════════════════════════════════
  // LESSONS
  // ════════════════════════════════════════════════════════════════════════════
  sectionHead("LESSONS  -  Add one block per lesson, copy the pattern as needed");

  const lessonFields: [string, string][] = [
    ["LESSON_TITLE",    "[Lesson title]"],
    ["LESSON_TYPE",     "TEXT"],
    ["LESSON_DURATION", "10"],
    ["LESSON_IS_FREE",  "no"],
    ["LESSON_CONTENT",  "[Lesson content or video URL. May span multiple lines.]"],
  ];

  for (let i = 1; i <= 3; i++) {
    const BLOCK_H = lessonFields.length * 15 + 46;
    need(BLOCK_H);

    // Card border
    page.drawRectangle({
      x: MARGIN, y: y - BLOCK_H + 18,
      width: C_WIDTH, height: BLOCK_H,
      color: BG_LESSON,
      borderColor: BORDER,
      borderWidth: 0.6,
    });

    // Orange top bar for lesson header
    page.drawRectangle({
      x: MARGIN, y: y,
      width: C_WIDTH, height: 18,
      color: ORANGE,
    });
    page.drawText(`--- LESSON ${i} ---`, {
      x: MARGIN + 8, y: y + 4,
      size: 9, font: monoBold,
      color: WHITE,
    });
    y -= 18;

    for (let j = 0; j < lessonFields.length; j++) {
      const [key, placeholder] = lessonFields[j];
      need(15);
      if (j % 2 === 1) {
        page.drawRectangle({ x: MARGIN, y: y - 3, width: C_WIDTH, height: 15, color: BG_ROW_ALT });
      }
      const kl = `${key}: `;
      const kw = monoBold.widthOfTextAtSize(kl, 8.5);
      page.drawText(kl,          { x: MARGIN + 8, y, size: 8.5, font: monoBold, color: ORANGE_DARK });
      page.drawText(placeholder, { x: MARGIN + 8 + kw, y, size: 8.5, font: mono, color: INK_MED, maxWidth: C_WIDTH - kw - 16 });
      y -= 15;
    }

    // Orange bottom bar
    need(18);
    page.drawRectangle({ x: MARGIN, y: y, width: C_WIDTH, height: 18, color: ORANGE });
    page.drawText(`--- END LESSON ---`, {
      x: MARGIN + 8, y: y + 4,
      size: 9, font: monoBold,
      color: WHITE,
    });
    y -= 18;
    gap(10);
  }

  // ── Final footer ──────────────────────────────────────────────────────────
  drawFooter();

  const pdfBytes = await doc.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="coachnest-course-template.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
