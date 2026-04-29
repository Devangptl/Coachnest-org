/**
 * GET /api/instructor/courses/template
 * Generates and downloads a structured PDF template instructors fill to bulk-create courses.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const PAGE_W = 595.28; // A4 width  (pt)
const PAGE_H = 841.89; // A4 height (pt)
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "INSTRUCTOR" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const doc = await PDFDocument.create();
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const monoFont = await doc.embedFont(StandardFonts.Courier);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  // ── helpers ────────────────────────────────────────────────────────
  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  const line = (
    text: string,
    size: number,
    isBold = false,
    color: [number, number, number] = [0.1, 0.1, 0.1],
    x = MARGIN,
  ) => {
    ensureSpace(size + 6);
    page.drawText(text, {
      x,
      y,
      size,
      font: isBold ? boldFont : font,
      color: rgb(...color),
      maxWidth: CONTENT_W - (x - MARGIN),
    });
    y -= size + 6;
  };

  const monoLine = (
    text: string,
    size = 9,
    color: [number, number, number] = [0.15, 0.15, 0.15],
  ) => {
    ensureSpace(size + 5);
    page.drawText(text, {
      x: MARGIN,
      y,
      size,
      font: monoFont,
      color: rgb(...color),
    });
    y -= size + 5;
  };

  const gap = (pts = 10) => { y -= pts; };

  const rule = (color: [number, number, number] = [0.75, 0.75, 0.75]) => {
    ensureSpace(6);
    page.drawLine({
      start: { x: MARGIN, y: y + 4 },
      end:   { x: PAGE_W - MARGIN, y: y + 4 },
      thickness: 0.6,
      color: rgb(...color),
    });
    y -= 8;
  };

  const sectionHeader = (title: string) => {
    gap(6);
    rule([0.6, 0.7, 0.9]);
    line(title, 11, true, [0.15, 0.3, 0.75]);
    rule([0.6, 0.7, 0.9]);
    gap(4);
  };

  // ── Header ─────────────────────────────────────────────────────────
  line("LEARNHUB  —  COURSE CREATION TEMPLATE", 16, true, [0.1, 0.25, 0.7]);
  rule([0.1, 0.25, 0.7]);
  gap(4);

  // ── Instructions ───────────────────────────────────────────────────
  line("HOW TO USE THIS TEMPLATE", 10, true, [0.4, 0.4, 0.4]);
  gap(2);
  line("1.  Copy the text block below into any text editor (Notepad, VS Code, etc.).", 9, false, [0.3, 0.3, 0.3]);
  line("2.  Replace every placeholder (text inside square brackets [ ]) with your content.", 9, false, [0.3, 0.3, 0.3]);
  line("3.  Add or remove LESSON blocks as needed — one block per lesson.", 9, false, [0.3, 0.3, 0.3]);
  line("4.  Save the file and export / print-to-PDF.", 9, false, [0.3, 0.3, 0.3]);
  line("5.  Upload the PDF on the LearnHub 'Import Course' page.", 9, false, [0.3, 0.3, 0.3]);
  gap(4);
  line("Supported LEVEL values: beginner | intermediate | advanced", 8, false, [0.5, 0.5, 0.5]);
  line("Supported LESSON_TYPE values: TEXT | VIDEO", 8, false, [0.5, 0.5, 0.5]);
  line("PRICE: 0 creates a free course.  LESSON_IS_FREE: yes | no", 8, false, [0.5, 0.5, 0.5]);

  // ── Course Section ─────────────────────────────────────────────────
  sectionHeader("COURSE INFORMATION");

  const courseFields: [string, string][] = [
    ["COURSE_TITLE",  "[Your course title]"],
    ["SHORT_DESC",    "[Brief tagline — max 140 chars]"],
    ["DESCRIPTION",  "[Full course description. Can be multiple lines.]"],
    ["LEVEL",        "beginner"],
    ["LANGUAGE",     "English"],
    ["PRICE",        "0"],
    ["CATEGORY",     "[Category name or leave blank]"],
    ["TAGS",         "[tag1, tag2, tag3]"],
  ];

  for (const [key, placeholder] of courseFields) {
    ensureSpace(16);
    const keyLabel = `${key}: `;
    const keyW = boldFont.widthOfTextAtSize(keyLabel, 10);
    page.drawText(keyLabel, { x: MARGIN, y, size: 10, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(placeholder, { x: MARGIN + keyW, y, size: 10, font, color: rgb(0.45, 0.45, 0.45), maxWidth: CONTENT_W - keyW });
    y -= 16;
  }

  // ── Lessons Section ────────────────────────────────────────────────
  sectionHeader("LESSONS  (repeat the block below for each lesson)");

  const lessonFields: [string, string][] = [
    ["LESSON_TITLE",    "[Lesson title]"],
    ["LESSON_TYPE",     "TEXT"],
    ["LESSON_DURATION", "10"],
    ["LESSON_IS_FREE",  "no"],
    ["LESSON_CONTENT",  "[Lesson content or video URL. Multi-line is fine.]"],
  ];

  for (let i = 1; i <= 3; i++) {
    gap(6);
    ensureSpace(20);
    page.drawRectangle({
      x: MARGIN - 4,
      y: y - 2,
      width: CONTENT_W + 8,
      height: 18,
      color: rgb(0.93, 0.96, 1.0),
      borderColor: rgb(0.6, 0.75, 0.95),
      borderWidth: 0.5,
    });
    monoLine(`--- LESSON ${i} ---`, 10, [0.1, 0.35, 0.6]);

    for (const [key, placeholder] of lessonFields) {
      ensureSpace(15);
      const keyLabel = `${key}: `;
      const kw = boldFont.widthOfTextAtSize(keyLabel, 9);
      page.drawText(keyLabel, { x: MARGIN + 8, y, size: 9, font: boldFont, color: rgb(0.15, 0.15, 0.15) });
      page.drawText(placeholder, { x: MARGIN + 8 + kw, y, size: 9, font, color: rgb(0.45, 0.45, 0.45), maxWidth: CONTENT_W - kw - 8 });
      y -= 15;
    }

    ensureSpace(20);
    page.drawRectangle({
      x: MARGIN - 4,
      y: y - 2,
      width: CONTENT_W + 8,
      height: 18,
      color: rgb(0.93, 0.96, 1.0),
      borderColor: rgb(0.6, 0.75, 0.95),
      borderWidth: 0.5,
    });
    monoLine(`--- END LESSON ---`, 10, [0.1, 0.35, 0.6]);
  }

  // ── Footer note ────────────────────────────────────────────────────
  gap(16);
  rule();
  line("Generated by LearnHub  •  Delete these instructions before uploading if your PDF editor retains them.", 7, false, [0.6, 0.6, 0.6]);

  const pdfBytes = await doc.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="learnhub-course-template.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
