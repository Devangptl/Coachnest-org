/**
 * Certificate PDF generation using pdf-lib.
 *
 * Visual language matches the on-screen certificate design:
 *   - Light background with a subtle guilloché pattern
 *   - CoachNest logo top-left (embedded from /public/logo.png)
 *   - Big serif "CERTIFICATE OF COMPLETION" title
 *   - Recipient name in brand-orange italic
 *   - Course title + completion date
 *   - Signature flourish + instructor name bottom-left
 *   - Vertical orange ribbon with circular "verified" seal on the right
 *   - Deterministic QR-style block + short certificate id bottom-right
 *
 * Landscape A4: 841.89 × 595.28 pt
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { PDFDocument, PDFFont, PDFPage, degrees, rgb, StandardFonts } from "pdf-lib";

interface CertificateData {
  recipientName:  string;
  courseTitle:    string;
  instructorName: string;
  issuedAt:       Date;
  certificateId:  string;
}

// ─── Color palette (matches on-screen preview) ────────────────────────────────
const C = {
  bg:       rgb(1, 1, 1),                     // white
  ink:      rgb(0.118, 0.161, 0.231),         // slate-800
  inkDeep:  rgb(0.059, 0.090, 0.165),         // slate-900
  ink2:     rgb(0.298, 0.337, 0.416),         // slate-600
  ink3:     rgb(0.475, 0.510, 0.580),         // slate-500
  border:   rgb(0.792, 0.831, 0.882),         // slate-300
  orange:   rgb(0.976, 0.451, 0.086),         // #f97316
  orangeLo: rgb(0.769, 0.243, 0.024),         // ribbon tip shadow
  blue:     rgb(0.114, 0.306, 0.847),         // #1d4ed8
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fitSize(text: string, maxWidth: number, maxSize: number, minSize: number, font: PDFFont): number {
  let size = maxSize;
  while (font.widthOfTextAtSize(text, size) > maxWidth && size > minSize) size -= 0.5;
  return size;
}

function wrapText(text: string, maxWidth: number, size: number, font: PDFFont): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Deterministic 9×9 QR-style pattern from the cert id (matches the on-screen one).
function qrCells(seed: string): boolean[] {
  const SIZE = 9;
  const cells: boolean[] = new Array(SIZE * SIZE);
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = 0; i < cells.length; i++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    cells[i] = (h & 1) === 1;
  }
  const corners: [number, number][] = [[0, 0], [0, SIZE - 1], [SIZE - 1, 0]];
  for (const [cx, cy] of corners) {
    for (let dy = 0; dy < 3; dy++) {
      for (let dx = 0; dx < 3; dx++) {
        const x = cx === 0 ? dx : cx - 2 + dx;
        const y = cy === 0 ? dy : cy - 2 + dy;
        const edge = dx === 0 || dy === 0 || dx === 2 || dy === 2;
        cells[y * SIZE + x] = edge;
      }
    }
  }
  return cells;
}

function drawGuilloche(page: PDFPage, cx: number, cy: number) {
  for (let i = 0; i < 14; i++) {
    page.drawEllipse({
      x: cx,
      y: cy,
      xScale: 175 - i * 6,
      yScale: 110 - i * 4,
      borderColor: C.blue,
      borderWidth: 0.3,
      borderOpacity: 0.12,
      rotate: degrees(i * 13),
      color: C.bg,
      opacity: 0,
    });
  }
}

function drawSeal(page: PDFPage, cx: number, cy: number, fontBold: PDFFont) {
  // Outer ring
  page.drawCircle({ x: cx, y: cy, size: 22, color: C.bg, borderColor: C.blue, borderWidth: 1.6 });
  // Inner ring (single thin circle — pdf-lib has no dashed strokes)
  page.drawCircle({ x: cx, y: cy, size: 18, borderColor: C.blue, borderWidth: 0.4, borderOpacity: 0.5, color: C.bg, opacity: 0 });

  // Star ring (small orange dots)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    page.drawCircle({
      x: cx + Math.cos(a) * 15,
      y: cy + Math.sin(a) * 15,
      size: 0.9,
      color: C.orange,
    });
  }

  // VERIFIED top, CERTIFICATE bottom (straight — pdf-lib has no text-on-path)
  const top = "VERIFIED";
  const bot = "CERTIFICATE";
  const topW = fontBold.widthOfTextAtSize(top, 4);
  const botW = fontBold.widthOfTextAtSize(bot, 4);
  page.drawText(top, { x: cx - topW / 2, y: cy + 13, size: 4, font: fontBold, color: C.blue });
  page.drawText(bot, { x: cx - botW / 2, y: cy - 16, size: 4, font: fontBold, color: C.blue });

  // Center brand letter
  const letter = "C";
  const letW = fontBold.widthOfTextAtSize(letter, 18);
  page.drawText(letter, { x: cx - letW / 2, y: cy - 6, size: 18, font: fontBold, color: C.blue });
}

// ─── Main generator ───────────────────────────────────────────────────────────

export async function generateCertificatePDF(data: CertificateData): Promise<Buffer> {
  const doc  = await PDFDocument.create();
  const page = doc.addPage([841.89, 595.28]);
  const W = page.getWidth();
  const H = page.getHeight();

  const regular = await doc.embedFont(StandardFonts.TimesRoman);
  const bold    = await doc.embedFont(StandardFonts.TimesRomanBold);
  const italic  = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const sans    = await doc.embedFont(StandardFonts.HelveticaBold);

  // ── Background + decorative pattern ────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.bg });
  drawGuilloche(page, W * 0.62, H * 0.5);

  // ── Brand logo top-left ────────────────────────────────────────────────────
  const brandX = 42;
  const logoBytes = await fs.readFile(path.join(process.cwd(), "public", "logo.png"));
  const logo = await doc.embedPng(logoBytes);
  const logoH = 36;
  const logoW = (logo.width / logo.height) * logoH;
  page.drawImage(logo, {
    x: brandX,
    y: H - 30 - logoH,
    width: logoW,
    height: logoH,
  });

  // ── Title ──────────────────────────────────────────────────────────────────
  // Tracked-out by inserting hair spaces (pdf-lib has no characterSpacing prop).
  const titleY = H - 165;
  page.drawText("CERTIFICATE  OF  COMPLETION", {
    x: brandX, y: titleY,
    size: 30, font: bold, color: C.inkDeep,
  });

  // ── Body block ─────────────────────────────────────────────────────────────
  const bodyX = brandX;
  const bodyMaxW = W * 0.62;

  page.drawText("Presented to", {
    x: bodyX, y: H - 220, size: 11, font: regular, color: C.ink2,
  });

  const nameSize = fitSize(data.recipientName, bodyMaxW, 32, 18, italic);
  page.drawText(data.recipientName, {
    x: bodyX, y: H - 258, size: nameSize, font: italic, color: C.orange,
  });

  page.drawText("For successfully completing an online course", {
    x: bodyX, y: H - 320, size: 11, font: regular, color: C.ink2,
  });

  const courseSize = fitSize(data.courseTitle, bodyMaxW, 18, 12, bold);
  const courseLines = wrapText(data.courseTitle, bodyMaxW, courseSize, bold).slice(0, 2);
  let courseY = H - 342;
  for (const line of courseLines) {
    page.drawText(line, { x: bodyX, y: courseY, size: courseSize, font: bold, color: C.inkDeep });
    courseY -= courseSize + 4;
  }

  const dateText = `Course completed on ${new Intl.DateTimeFormat("en-US", {
    month: "long", year: "numeric",
  }).format(data.issuedAt)}`;
  page.drawText(dateText, {
    x: bodyX, y: courseY - 8, size: 10, font: regular, color: C.ink2,
  });

  // ── Signature bottom-left ──────────────────────────────────────────────────
  // Stylised "handwritten" mark: instructor name in italic at signature-size,
  // an underline beneath, then the printed name and role below.
  const sigBaseX = brandX;
  const sigBaseY = 110;
  const sigFlourishSize = fitSize(data.instructorName, W * 0.32, 22, 14, italic);
  const sigFlourishW = italic.widthOfTextAtSize(data.instructorName, sigFlourishSize);
  page.drawText(data.instructorName, {
    x: sigBaseX, y: sigBaseY,
    size: sigFlourishSize, font: italic, color: C.ink,
  });
  page.drawLine({
    start: { x: sigBaseX, y: sigBaseY - 4 },
    end:   { x: sigBaseX + Math.max(sigFlourishW, 110), y: sigBaseY - 4 },
    thickness: 0.6, color: C.ink3, opacity: 0.7,
  });

  page.drawText(data.instructorName, {
    x: sigBaseX, y: sigBaseY - 22, size: 11, font: bold, color: C.ink,
  });
  page.drawText("Course Instructor, CoachNest", {
    x: sigBaseX, y: sigBaseY - 36, size: 8.5, font: regular, color: C.ink3,
  });

  // ── Right ribbon + seal ────────────────────────────────────────────────────
  const ribbonW = 38;
  const ribbonX = W - W * 0.18 - ribbonW / 2;
  const ribbonTopY = H;
  const ribbonBottomY = H * 0.42;
  page.drawRectangle({
    x: ribbonX, y: ribbonBottomY,
    width: ribbonW,
    height: ribbonTopY - ribbonBottomY,
    color: C.orange,
  });
  // Chevron tip
  const tipH = 12;
  page.drawSvgPath(
    `M 0 0 L ${ribbonW} 0 L ${ribbonW / 2} ${tipH} Z`,
    { x: ribbonX, y: ribbonBottomY, color: C.orangeLo },
  );
  // Seal centred over the ribbon at ~58% down
  const sealCx = ribbonX + ribbonW / 2;
  const sealCy = ribbonBottomY + (ribbonTopY - ribbonBottomY) * 0.18;
  drawSeal(page, sealCx, sealCy, sans);

  // ── QR-style block + cert id (bottom-right) ────────────────────────────────
  const qrSize = 70;
  const qrX = W - qrSize - 42;
  const qrY = 60;
  // Border + padding
  page.drawRectangle({
    x: qrX - 4, y: qrY - 4,
    width: qrSize + 8, height: qrSize + 8,
    color: C.bg, borderColor: C.border, borderWidth: 0.6,
  });
  const cells = qrCells(data.certificateId);
  const cell = qrSize / 9;
  for (let i = 0; i < 81; i++) {
    if (!cells[i]) continue;
    const x = qrX + (i % 9) * cell;
    const y = qrY + (8 - Math.floor(i / 9)) * cell;
    page.drawRectangle({ x, y, width: cell, height: cell, color: C.inkDeep });
  }

  const shortId = `ID · ${data.certificateId.slice(0, 12).toUpperCase()}`;
  const shortIdW = regular.widthOfTextAtSize(shortId, 7);
  page.drawText(shortId, {
    x: qrX + qrSize - shortIdW, y: qrY - 14,
    size: 7, font: regular, color: C.ink3,
  });

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}
