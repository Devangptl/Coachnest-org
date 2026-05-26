/**
 * GET /api/instructor/courses/template
 * Generates a professional branded course-creation template PDF.
 * Covers all three lesson types: TEXT, VIDEO, and QUIZ.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFileSync } from "fs";
import { join } from "path";

// ── Layout ──────────────────────────────────────────────────────────────────
const PAGE_W  = 595.28;
const PAGE_H  = 841.89;
const MARGIN  = 48;
const CW      = PAGE_W - MARGIN * 2;   // content width

// ── Palette ─────────────────────────────────────────────────────────────────
const ORANGE      = rgb(0.976, 0.451, 0.086);  // #f97316  brand primary
const ORANGE_D    = rgb(0.800, 0.280, 0.020);  // #cc4705  dark variant
const ORANGE_BG   = rgb(1.000, 0.960, 0.934);  // #fff5ee  lightest tint
const ORANGE_RULE = rgb(0.976, 0.600, 0.380);  // #f999_   mid rule

const BLUE        = rgb(0.220, 0.400, 0.800);  // #386acc  video accent
const BLUE_BG     = rgb(0.937, 0.949, 0.996);  // #eff2fe
const BLUE_D      = rgb(0.140, 0.290, 0.640);  // #244aa3

const PURPLE      = rgb(0.500, 0.200, 0.800);  // #8033cc  quiz accent
const PURPLE_BG   = rgb(0.964, 0.937, 0.996);  // #f6efff
const PURPLE_D    = rgb(0.360, 0.130, 0.600);  // #5c2199

const INK         = rgb(0.082, 0.082, 0.082);  // #151515
const INK_2       = rgb(0.260, 0.260, 0.260);  // #424242
const INK_3       = rgb(0.500, 0.500, 0.500);  // #808080
const BORDER      = rgb(0.859, 0.859, 0.859);  // #dbdbdb
const BORDER_DARK = rgb(0.780, 0.780, 0.780);  // #c7c7c7
const ROW_ALT     = rgb(0.968, 0.968, 0.968);  // #f7f7f7
const CARD_BG     = rgb(0.990, 0.990, 0.990);  // #fcfcfc
const WHITE       = rgb(1, 1, 1);

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

  const logoBuf = readFileSync(join(process.cwd(), "public", "logo.png"));
  const logoImg = await doc.embedPng(logoBuf);
  const LOGO_W  = 120;
  const LOGO_H  = LOGO_W * (logoImg.height / logoImg.width);

  let page    = doc.addPage([PAGE_W, PAGE_H]);
  let y       = PAGE_H;
  let pageNum = 1;

  // ── Primitive helpers ────────────────────────────────────────────────────
  const gap = (n = 8) => { y -= n; };

  const need = (h: number) => {
    if (y - h < MARGIN + 28) {
      drawFooter();
      page = doc.addPage([PAGE_W, PAGE_H]);
      pageNum++;
      y = PAGE_H - MARGIN;
    }
  };

  const hline = (
    lx = MARGIN, lw = CW,
    thickness = 0.5,
    col = BORDER,
  ) => {
    page.drawLine({
      start: { x: lx, y },
      end:   { x: lx + lw, y },
      thickness, color: col,
    });
    y -= thickness;
  };

  // ── Footer ───────────────────────────────────────────────────────────────
  const drawFooter = () => {
    const fy = 30;
    page.drawLine({
      start: { x: MARGIN, y: fy + 12 },
      end:   { x: PAGE_W - MARGIN, y: fy + 12 },
      thickness: 0.4, color: BORDER,
    });
    page.drawText("Coachnest  -  Course Creation Template", {
      x: MARGIN, y: fy, size: 7, font: regular, color: INK_3,
    });
    const pl = `Page ${pageNum}`;
    page.drawText(pl, {
      x: PAGE_W - MARGIN - regular.widthOfTextAtSize(pl, 7),
      y: fy, size: 7, font: regular, color: INK_3,
    });
  };

  // ── Section heading ───────────────────────────────────────────────────────
  const sectionHead = (label: string) => {
    gap(18);
    need(24);
    // Orange left accent bar
    page.drawRectangle({ x: MARGIN, y: y - 3, width: 3, height: 17, color: ORANGE });
    page.drawText(label, { x: MARGIN + 11, y, size: 10.5, font: bold, color: INK });
    y -= 16;
    hline(MARGIN + 11, CW - 11, 0.4, BORDER);
    gap(8);
  };

  // ── Field row (alternating bg) ─────────────────────────────────────────────
  const fieldRow = (
    key: string,
    value: string,
    alt: boolean,
    indent = 0,
    keyColor = ORANGE_D,
  ) => {
    const ROW_H = 17;
    need(ROW_H + 2);
    if (alt) {
      page.drawRectangle({
        x: MARGIN + indent - 3,
        y: y - 5,
        width: CW - indent + 6,
        height: ROW_H + 2,
        color: ROW_ALT,
      });
    }
    const kl = `${key}: `;
    const kw = monoBold.widthOfTextAtSize(kl, 9);
    page.drawText(kl,    { x: MARGIN + indent + 4, y, size: 9, font: monoBold, color: keyColor });
    page.drawText(value, { x: MARGIN + indent + 4 + kw, y, size: 9, font: mono, color: INK_2, maxWidth: CW - indent - kw - 10 });
    y -= ROW_H;
  };

  // ── Lesson block renderer ─────────────────────────────────────────────────
  interface LessonBlock {
    label:    string;
    tagColor: [number, number, number][];   // [bg, text, border-accent]
    tagText:  string;
    fields:   [string, string][];
    note?:    string;
  }

  const drawLessonBlock = (block: LessonBlock) => {
    const fieldH  = block.fields.length * 17;
    const noteH   = block.note ? 24 : 0;
    const BLOCK_H = 24 + fieldH + noteH + 26 + 16; // header + fields + note + footer + padding
    need(BLOCK_H);

    const blockY  = y;
    const blockBg = block.tagColor[0];
    const accentC: [number, number, number] = block.tagColor[2] as [number, number, number];

    // Card background
    page.drawRectangle({
      x: MARGIN, y: blockY - BLOCK_H + 8,
      width: CW, height: BLOCK_H,
      color: CARD_BG,
      borderColor: BORDER_DARK,
      borderWidth: 0.5,
    });

    // Left accent stripe
    page.drawRectangle({
      x: MARGIN, y: blockY - BLOCK_H + 8,
      width: 3, height: BLOCK_H,
      color: rgb(...accentC),
    });

    // Header row (light tinted bg, no solid fill)
    page.drawRectangle({
      x: MARGIN + 3, y: blockY - 20,
      width: CW - 3, height: 26,
      color: rgb(...(blockBg as [number, number, number])),
    });
    page.drawText(block.label, {
      x: MARGIN + 12, y: blockY - 14,
      size: 9, font: monoBold, color: INK,
    });

    // Type badge
    const badgeW = monoBold.widthOfTextAtSize(block.tagText, 7.5) + 10;
    page.drawRectangle({
      x: PAGE_W - MARGIN - badgeW - 2,
      y: blockY - 18,
      width: badgeW, height: 14,
      color: rgb(...(accentC as [number, number, number])),
      borderColor: rgb(...(accentC as [number, number, number])),
      borderWidth: 0,
    });
    page.drawText(block.tagText, {
      x: PAGE_W - MARGIN - badgeW + 3, y: blockY - 14,
      size: 7.5, font: monoBold, color: WHITE,
    });

    y = blockY - 22;

    // Fields
    for (let i = 0; i < block.fields.length; i++) {
      const [k, v] = block.fields[i];
      const kColor = block.tagColor[2] as [number, number, number];
      fieldRow(k, v, i % 2 === 1, 8, rgb(...kColor));
    }

    // Optional note
    if (block.note) {
      gap(4);
      need(20);
      page.drawText(block.note, {
        x: MARGIN + 14, y,
        size: 7.5, font: regular, color: INK_3,
        maxWidth: CW - 20,
      });
      y -= 14;
    }

    // Footer row
    need(22);
    page.drawRectangle({
      x: MARGIN + 3, y: y - 4,
      width: CW - 3, height: 18,
      color: rgb(...(blockBg as [number, number, number])),
    });
    page.drawText("--- END LESSON ---", {
      x: MARGIN + 12, y: y + 1,
      size: 8.5, font: monoBold, color: INK_2,
    });
    y -= 6;
    gap(14);
  };

  // ════════════════════════════════════════════════════════════════════════════
  // HEADER  (white background — logo at natural colour)
  // ════════════════════════════════════════════════════════════════════════════
  const HEADER_H = 68;

  // White header background
  page.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: HEADER_H, color: WHITE });

  // Logo — natural colours on white
  page.drawImage(logoImg, {
    x: MARGIN,
    y: PAGE_H - HEADER_H + (HEADER_H - LOGO_H) / 2,
    width: LOGO_W,
    height: LOGO_H,
  });

  // Right-side label stack
  const tagLine1 = "COURSE CREATION TEMPLATE";
  const tagLine2 = "coachnest.com";
  page.drawText(tagLine1, {
    x: PAGE_W - MARGIN - bold.widthOfTextAtSize(tagLine1, 9),
    y: PAGE_H - HEADER_H / 2 + 3,
    size: 9, font: bold, color: INK,
  });
  page.drawText(tagLine2, {
    x: PAGE_W - MARGIN - regular.widthOfTextAtSize(tagLine2, 7.5),
    y: PAGE_H - HEADER_H / 2 - 10,
    size: 7.5, font: regular, color: INK_3,
  });

  // Single orange rule under header
  y = PAGE_H - HEADER_H;
  page.drawRectangle({ x: 0, y: y - 2, width: PAGE_W, height: 2, color: ORANGE });
  y -= 2;

  y = PAGE_H - HEADER_H - 28;

  // ════════════════════════════════════════════════════════════════════════════
  // HOW TO USE
  // ════════════════════════════════════════════════════════════════════════════
  sectionHead("HOW TO USE THIS TEMPLATE");

  const steps: string[] = [
    "Open this file in any text editor (VS Code, Notepad, TextEdit).",
    "Fill in each field value after the colon — replace placeholder text in [ ].",
    "Choose the right LESSON_TYPE for each lesson: TEXT, VIDEO, or QUIZ.",
    "Add or duplicate LESSON blocks as needed — one block per lesson.",
    "Export / save as PDF (File > Print > Save as PDF works in any editor).",
    "Upload the PDF at Coachnest > My Courses > Import from PDF.",
  ];

  for (let i = 0; i < steps.length; i++) {
    need(17);
    page.drawText(`${i + 1}`, { x: MARGIN + 4, y, size: 8.5, font: bold, color: ORANGE });
    page.drawText(steps[i],   { x: MARGIN + 18, y, size: 8.5, font: regular, color: INK_2, maxWidth: CW - 18 });
    y -= 16;
  }

  gap(14);

  // ── Quick-reference box ───────────────────────────────────────────────────
  const refRows: [string, string][] = [
    ["LEVEL",           "beginner  |  intermediate  |  advanced"],
    ["LESSON_TYPE",     "TEXT  |  VIDEO  |  QUIZ"],
    ["PRICE",           "0 = free course,   any number = paid  (e.g. 29.99)"],
    ["LESSON_IS_FREE",  "yes  |  no"],
  ];
  const BOX_H = refRows.length * 15 + 26;
  need(BOX_H + 4);

  page.drawRectangle({
    x: MARGIN, y: y - BOX_H + 14,
    width: CW, height: BOX_H,
    color: ORANGE_BG,
    borderColor: ORANGE_RULE,
    borderWidth: 0.6,
  });
  // Orange left accent
  page.drawRectangle({ x: MARGIN, y: y - BOX_H + 14, width: 3, height: BOX_H, color: ORANGE });

  page.drawText("QUICK REFERENCE", { x: MARGIN + 10, y: y + 2, size: 7.5, font: bold, color: ORANGE_D });
  y -= 14;

  for (const [k, v] of refRows) {
    need(15);
    const kl = `${k}: `;
    const kw = monoBold.widthOfTextAtSize(kl, 8);
    page.drawText(kl, { x: MARGIN + 10, y, size: 8, font: monoBold, color: INK });
    page.drawText(v,  { x: MARGIN + 10 + kw, y, size: 8, font: mono, color: INK_2 });
    y -= 15;
  }

  gap(6);

  // ════════════════════════════════════════════════════════════════════════════
  // COURSE INFORMATION
  // ════════════════════════════════════════════════════════════════════════════
  sectionHead("COURSE INFORMATION");

  const courseFields: [string, string][] = [
    ["COURSE_TITLE",  "[Your course title]"],
    ["SHORT_DESC",    "[Brief tagline - max 140 chars]"],
    ["DESCRIPTION",  "[Full description. May span multiple lines.]"],
    ["LEVEL",        "beginner"],
    ["LANGUAGE",     "English"],
    ["PRICE",        "0"],
    ["CATEGORY",     "[Category name or leave blank]"],
    ["TAGS",         "[tag1, tag2, tag3]"],
  ];

  for (let i = 0; i < courseFields.length; i++) {
    fieldRow(courseFields[i][0], courseFields[i][1], i % 2 === 1);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // LESSON TYPES
  // ════════════════════════════════════════════════════════════════════════════
  sectionHead("LESSON TYPES  -  One block per lesson, copy the pattern as needed");

  // ── TYPE 1: TEXT ─────────────────────────────────────────────────────────
  gap(4);
  need(16);
  page.drawText("Type 1: TEXT  -  written lesson body, markdown supported", {
    x: MARGIN + 4, y, size: 8, font: bold, color: INK_2,
  });
  y -= 16;

  drawLessonBlock({
    label:    "--- LESSON 1 ---",
    tagText:  "TEXT",
    tagColor: [
      [0.968, 0.968, 0.968],   // header bg  (light gray)
      [0.082, 0.082, 0.082],   // text
      [0.220, 0.220, 0.220],   // accent / badge  (dark)
    ],
    fields: [
      ["LESSON_TITLE",    "[Lesson title]"],
      ["LESSON_TYPE",     "TEXT"],
      ["LESSON_DURATION", "15"],
      ["LESSON_IS_FREE",  "no"],
      ["LESSON_CONTENT",  "[Write your lesson content here. Markdown is supported.]"],
      ["",                "[Continue on a new line — the parser collects until the next field.]"],
    ],
  });

  // ── TYPE 2: VIDEO ────────────────────────────────────────────────────────
  need(16);
  page.drawText("Type 2: VIDEO  -  paste a video URL (YouTube, Vimeo, direct .mp4, etc.)", {
    x: MARGIN + 4, y, size: 8, font: bold, color: BLUE_D,
  });
  y -= 16;

  drawLessonBlock({
    label:    "--- LESSON 2 ---",
    tagText:  "VIDEO",
    tagColor: [
      [0.937, 0.949, 0.996],   // header bg  (blue tint)
      [0.140, 0.290, 0.640],   // text
      [0.220, 0.400, 0.800],   // accent / badge  (blue)
    ],
    fields: [
      ["LESSON_TITLE",    "[Lesson title]"],
      ["LESSON_TYPE",     "VIDEO"],
      ["LESSON_DURATION", "20"],
      ["LESSON_IS_FREE",  "no"],
      ["LESSON_CONTENT",  "https://www.youtube.com/watch?v=your-video-id"],
    ],
    note: "Tip: LESSON_CONTENT holds the video URL. The player is embedded automatically on the course page.",
  });

  // ── TYPE 3: QUIZ ─────────────────────────────────────────────────────────
  need(16);
  page.drawText("Type 3: QUIZ  -  multiple-choice questions with auto-grading", {
    x: MARGIN + 4, y, size: 8, font: bold, color: PURPLE_D,
  });
  y -= 16;

  drawLessonBlock({
    label:    "--- LESSON 3 ---",
    tagText:  "QUIZ",
    tagColor: [
      [0.964, 0.937, 0.996],   // header bg  (purple tint)
      [0.360, 0.130, 0.600],   // text
      [0.500, 0.200, 0.800],   // accent / badge  (purple)
    ],
    fields: [
      ["LESSON_TITLE",    "[Quiz lesson title]"],
      ["LESSON_TYPE",     "QUIZ"],
      ["LESSON_DURATION", "15"],
      ["LESSON_IS_FREE",  "no"],
      ["QUIZ_TITLE",      "[Quiz display title]"],
      ["QUIZ_PASS_MARK",  "70"],
      ["QUIZ_TIME_LIMIT", "20"],
      ["",                ""],
      ["Q1",              "What does HTML stand for?"],
      ["A",               "HyperText Markup Language"],
      ["B",               "HighText Machine Language"],
      ["C",               "HyperText and links Markup Language"],
      ["D",               "None of the above"],
      ["CORRECT",         "A"],
      ["POINTS",          "1"],
      ["",                ""],
      ["Q2",              "Which CSS property changes text size?"],
      ["A",               "font-style"],
      ["B",               "text-size"],
      ["C",               "font-size"],
      ["D",               "text-style"],
      ["CORRECT",         "C"],
      ["POINTS",          "1"],
    ],
    note: "Tip: Add as many Q blocks as you need. QUIZ_TIME_LIMIT is in minutes (leave blank for no limit).",
  });

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
