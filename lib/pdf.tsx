/**
 * Certificate PDF generation using pdf-lib.
 *
 * Design: Navy blue + white + gold luxury landscape certificate.
 *   - Deep navy header/footer bands
 *   - Subtle guilloche pattern in the white body
 *   - Gold decorative corner ornaments and double border frame
 *   - "CERTIFICATE OF COMPLETION" in bold serif, letter-spaced
 *   - Recipient name in large italic (simulated script)
 *   - Course title in bold serif, navy
 *   - Two signature blocks (instructor + director) with ruled lines
 *   - Gold vertical ribbon on right edge with "COURSE COMPLETED" rotated text + seal
 *   - QR-style cert ID block bottom-right
 *   - Logo embedded top-left inside header
 *
 * Landscape A4: 841.89 × 595.28 pt
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { PDFDocument, PDFFont, PDFPage, degrees, rgb, StandardFonts } from "pdf-lib";

interface CertificateData {
  recipientName:   string;
  courseTitle:     string;
  instructorName:  string;
  issuedAt:        Date;
  certificateId:   string;
  directorName?:   string;
}

// ─── Color palette ─────────────────────────────────────────────────────────────
const C = {
  navy:      rgb(0.071, 0.133, 0.259),   // #122244 deep navy
  navyMid:   rgb(0.102, 0.180, 0.345),   // #1a2e58 mid navy
  navyLight: rgb(0.161, 0.247, 0.431),   // #293f6e light navy
  gold:      rgb(0.800, 0.663, 0.298),   // #ccaa4c gold
  goldLight: rgb(0.918, 0.792, 0.502),   // #eca980 light gold
  goldDark:  rgb(0.600, 0.471, 0.161),   // #997829 dark gold
  white:     rgb(1, 1, 1),
  offWhite:  rgb(0.980, 0.976, 0.965),   // warm off-white body
  inkDark:   rgb(0.071, 0.133, 0.259),   // same as navy for text
  inkMid:    rgb(0.200, 0.240, 0.320),
  inkLight:  rgb(0.400, 0.440, 0.510),
  cream:     rgb(0.996, 0.988, 0.957),   // #fef9f4 parchment
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

// ─── Decorative corner ornament (L-shaped gold lines + diamond dot) ────────────
function drawCorner(
  page: PDFPage,
  x: number, y: number,
  flipX: boolean, flipY: boolean,
) {
  const armLen = 28;
  const sx = flipX ? -1 : 1;
  const sy = flipY ? -1 : 1;
  const lw = 0.8;

  // Outer L
  page.drawLine({ start: { x, y }, end: { x: x + sx * armLen, y }, thickness: lw, color: C.gold });
  page.drawLine({ start: { x, y }, end: { x, y: y + sy * armLen }, thickness: lw, color: C.gold });

  // Inner L (offset 5pt)
  const ox = x + sx * 5;
  const oy = y + sy * 5;
  page.drawLine({ start: { x: ox, y: oy }, end: { x: ox + sx * (armLen - 8), y: oy }, thickness: lw * 0.7, color: C.goldDark });
  page.drawLine({ start: { x: ox, y: oy }, end: { x: ox, y: oy + sy * (armLen - 8) }, thickness: lw * 0.7, color: C.goldDark });

  // Diamond at corner
  const ds = 3;
  page.drawRectangle({
    x: x - ds * 0.5,
    y: y - ds * 0.5,
    width: ds, height: ds,
    color: C.gold,
    rotate: degrees(45),
  });
}

// ─── Guilloche background watermark ───────────────────────────────────────────
function drawGuilloche(page: PDFPage, cx: number, cy: number) {
  for (let i = 0; i < 18; i++) {
    page.drawEllipse({
      x: cx, y: cy,
      xScale: 200 - i * 7,
      yScale: 130 - i * 4.5,
      borderColor: C.navyLight,
      borderWidth: 0.35,
      borderOpacity: 0.10,
      rotate: degrees(i * 10),
      color: C.cream,
      opacity: 0,
    });
  }
}

// ─── Gold seal on ribbon ────────────────────────────────────────────────────────
function drawSeal(page: PDFPage, cx: number, cy: number, bold: PDFFont) {
  // Outer gold ring
  page.drawCircle({ x: cx, y: cy, size: 26, color: C.gold, borderColor: C.goldDark, borderWidth: 1.2 });
  // Inner white ring
  page.drawCircle({ x: cx, y: cy, size: 20, color: C.white, borderColor: C.goldDark, borderWidth: 0.8 });
  // Star points
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    page.drawCircle({ x: cx + Math.cos(a) * 23, y: cy + Math.sin(a) * 23, size: 1.2, color: C.goldDark });
  }
  // Navy monogram "L" for LearnHub / academy
  const ltr = "L";
  const lw = bold.widthOfTextAtSize(ltr, 22);
  page.drawText(ltr, { x: cx - lw / 2, y: cy - 7, size: 22, font: bold, color: C.navy });
}

// ─── Thin gold divider line with center diamond ────────────────────────────────
function drawDivider(page: PDFPage, x: number, y: number, width: number) {
  page.drawLine({ start: { x, y }, end: { x: x + width, y }, thickness: 0.5, color: C.gold, opacity: 0.7 });
  const ds = 3.5;
  page.drawRectangle({ x: x + width / 2 - ds * 0.5, y: y - ds * 0.5, width: ds, height: ds, color: C.gold, rotate: degrees(45) });
}

// ─── Main generator ────────────────────────────────────────────────────────────

export async function generateCertificatePDF(data: CertificateData): Promise<Buffer> {
  const doc  = await PDFDocument.create();
  const page = doc.addPage([841.89, 595.28]);
  const W = page.getWidth();   // 841.89
  const H = page.getHeight();  // 595.28

  const regular  = await doc.embedFont(StandardFonts.TimesRoman);
  const bold     = await doc.embedFont(StandardFonts.TimesRomanBold);
  const italic   = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const helv     = await doc.embedFont(StandardFonts.Helvetica);
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const ribbonW  = 72;   // gold ribbon on the right
  const bodyW    = W - ribbonW;
  const padX     = 48;
  const headerH  = 70;
  const footerH  = 52;

  // ── Parchment body background ────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width: bodyW, height: H, color: C.cream });

  // ── Navy header band ─────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: H - headerH, width: bodyW, height: headerH, color: C.navy });

  // ── Navy footer band ─────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width: bodyW, height: footerH, color: C.navy });

  // ── Gold ribbon panel (right side) ───────────────────────────────────────────
  page.drawRectangle({ x: bodyW, y: 0, width: ribbonW, height: H, color: C.navy });
  // Gold inner strip
  page.drawRectangle({ x: bodyW + 6, y: 0, width: ribbonW - 12, height: H, color: C.gold });
  // Darker gold center stripe
  page.drawRectangle({ x: bodyW + 18, y: 0, width: ribbonW - 36, height: H, color: C.goldDark, opacity: 0.35 });

  // ── Guilloche watermark centered in body ──────────────────────────────────────
  drawGuilloche(page, bodyW * 0.5, H * 0.5);

  // ── Outer gold border frame (inside body, excluding ribbon) ──────────────────
  const bm = 12; // border margin from edge of body
  page.drawRectangle({
    x: bm, y: bm,
    width: bodyW - bm * 2, height: H - bm * 2,
    color: C.cream, opacity: 0,
    borderColor: C.gold, borderWidth: 1.2,
  });
  // Inner border
  const bm2 = 17;
  page.drawRectangle({
    x: bm2, y: bm2,
    width: bodyW - bm2 * 2, height: H - bm2 * 2,
    color: C.cream, opacity: 0,
    borderColor: C.gold, borderWidth: 0.4, borderOpacity: 0.6,
  });

  // ── Corner ornaments ──────────────────────────────────────────────────────────
  const co = bm + 4;
  drawCorner(page, co,         H - co,         false, false);
  drawCorner(page, bodyW - co, H - co,         true,  false);
  drawCorner(page, co,         co,              false, true);
  drawCorner(page, bodyW - co, co,              true,  true);

  // ── Header: logo + academy name ───────────────────────────────────────────────
  try {
    const logoBytes = await fs.readFile(path.join(process.cwd(), "public", "logo.png"));
    const logo = await doc.embedPng(logoBytes);
    const logoH = 38;
    const logoW = (logo.width / logo.height) * logoH;
    page.drawImage(logo, { x: padX, y: H - headerH / 2 - logoH / 2, width: logoW, height: logoH });
  } catch {
    // logo missing — skip silently
  }

  // Academy name right-aligned in header
  const acad = "LearnHub Academy";
  const acadW = helvBold.widthOfTextAtSize(acad, 11);
  page.drawText(acad, {
    x: bodyW - padX - acadW, y: H - headerH / 2 + 5,
    size: 11, font: helvBold, color: C.gold,
  });
  const tagline = "Excellence in Online Education";
  const tagW = helv.widthOfTextAtSize(tagline, 7.5);
  page.drawText(tagline, {
    x: bodyW - padX - tagW, y: H - headerH / 2 - 7,
    size: 7.5, font: helv, color: C.goldLight, opacity: 0.85,
  });

  // ── Thin gold header underline ────────────────────────────────────────────────
  page.drawLine({
    start: { x: bm + 2, y: H - headerH },
    end:   { x: bodyW - bm - 2, y: H - headerH },
    thickness: 1, color: C.gold,
  });

  // ── Main content area setup ───────────────────────────────────────────────────
  const contentTop = H - headerH - 18;
  const contentX   = padX;
  const contentW   = bodyW - padX * 2;

  // ── "CERTIFICATE OF COMPLETION" title ────────────────────────────────────────
  const title = "CERTIFICATE  OF  COMPLETION";
  const titleSize = 26;
  const titleW = bold.widthOfTextAtSize(title, titleSize);
  const titleX = contentX + (contentW - titleW) / 2;
  const titleY = contentTop - 28;
  page.drawText(title, { x: titleX, y: titleY, size: titleSize, font: bold, color: C.navy });

  // Gold underline beneath title
  page.drawLine({
    start: { x: titleX + 4,          y: titleY - 5 },
    end:   { x: titleX + titleW - 4, y: titleY - 5 },
    thickness: 0.8, color: C.gold,
  });

  // ── "Presented to" label ──────────────────────────────────────────────────────
  const presLabel = "This is to certify that";
  const presW = regular.widthOfTextAtSize(presLabel, 10);
  page.drawText(presLabel, {
    x: contentX + (contentW - presW) / 2,
    y: titleY - 28,
    size: 10, font: regular, color: C.inkLight,
  });

  // ── Recipient name (large italic) ─────────────────────────────────────────────
  const nameMaxW = contentW * 0.84;
  const nameSize = fitSize(data.recipientName, nameMaxW, 42, 24, italic);
  const nameW    = italic.widthOfTextAtSize(data.recipientName, nameSize);
  const nameY    = titleY - 70;
  page.drawText(data.recipientName, {
    x: contentX + (contentW - nameW) / 2,
    y: nameY,
    size: nameSize, font: italic, color: C.navy,
  });

  // Gold underline beneath name
  const nameUnderX = contentX + (contentW - nameW) / 2;
  drawDivider(page, nameUnderX, nameY - 6, nameW);

  // ── Body text ─────────────────────────────────────────────────────────────────
  const bodyText = "has successfully completed the online course";
  const btW = regular.widthOfTextAtSize(bodyText, 10.5);
  page.drawText(bodyText, {
    x: contentX + (contentW - btW) / 2,
    y: nameY - 26,
    size: 10.5, font: regular, color: C.inkMid,
  });

  // ── Course title ──────────────────────────────────────────────────────────────
  const courseMaxW = contentW * 0.86;
  const courseSize = fitSize(data.courseTitle, courseMaxW, 20, 12, bold);
  const courseLines = wrapText(data.courseTitle, courseMaxW, courseSize, bold).slice(0, 2);
  let courseY = nameY - 54;
  for (const line of courseLines) {
    const lw = bold.widthOfTextAtSize(line, courseSize);
    page.drawText(line, {
      x: contentX + (contentW - lw) / 2,
      y: courseY,
      size: courseSize, font: bold, color: C.navy,
    });
    courseY -= courseSize + 5;
  }

  // Gold side decorators for course title
  const firstLineW = bold.widthOfTextAtSize(courseLines[0] ?? "", courseSize);
  const firstLineX = contentX + (contentW - firstLineW) / 2;
  const courseTitleY = nameY - 54;
  const dot = 2.8;
  // Left ornament
  page.drawRectangle({ x: firstLineX - 12, y: courseTitleY + courseSize * 0.4 - dot / 2, width: dot, height: dot, color: C.gold, rotate: degrees(45) });
  page.drawLine({ start: { x: firstLineX - 9, y: courseTitleY + courseSize * 0.4 }, end: { x: firstLineX - 4, y: courseTitleY + courseSize * 0.4 }, thickness: 0.6, color: C.gold });
  // Right ornament
  const lastLineW = bold.widthOfTextAtSize(courseLines[courseLines.length - 1] ?? "", courseSize);
  const lastLineX = contentX + (contentW - lastLineW) / 2;
  page.drawRectangle({ x: lastLineX + lastLineW + 9, y: courseTitleY + courseSize * 0.4 - dot / 2, width: dot, height: dot, color: C.gold, rotate: degrees(45) });
  page.drawLine({ start: { x: lastLineX + lastLineW + 4, y: courseTitleY + courseSize * 0.4 }, end: { x: lastLineX + lastLineW + 9, y: courseTitleY + courseSize * 0.4 }, thickness: 0.6, color: C.gold });

  // ── Date and issuer info ───────────────────────────────────────────────────────
  const formattedDate = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(data.issuedAt);
  const dateText = `Issued on ${formattedDate}`;
  const dateW = regular.widthOfTextAtSize(dateText, 9);
  page.drawText(dateText, {
    x: contentX + (contentW - dateW) / 2,
    y: courseY - 8,
    size: 9, font: regular, color: C.inkLight,
  });

  // ── Horizontal divider across full content width ──────────────────────────────
  const divY = footerH + 62;
  drawDivider(page, contentX, divY, contentW);

  // ── Two signature blocks ───────────────────────────────────────────────────────
  const sigW      = contentW * 0.36;
  const sigLeftX  = contentX;
  const sigRightX = contentX + contentW - sigW;
  const sigLineY  = footerH + 36;
  const sigNameY  = sigLineY - 14;
  const sigRoleY  = sigNameY - 13;

  // Instructor signature
  const instrFlourishSize = fitSize(data.instructorName, sigW, 18, 12, italic);
  const instrFlourishW    = italic.widthOfTextAtSize(data.instructorName, instrFlourishSize);
  page.drawText(data.instructorName, {
    x: sigLeftX, y: sigLineY + 3,
    size: instrFlourishSize, font: italic, color: C.navy, opacity: 0.75,
  });
  page.drawLine({
    start: { x: sigLeftX, y: sigLineY },
    end:   { x: sigLeftX + Math.max(instrFlourishW + 10, sigW * 0.85), y: sigLineY },
    thickness: 0.6, color: C.gold,
  });
  page.drawText(data.instructorName, {
    x: sigLeftX, y: sigNameY,
    size: 9.5, font: bold, color: C.inkDark,
  });
  page.drawText("Course Instructor", {
    x: sigLeftX, y: sigRoleY,
    size: 8, font: helv, color: C.inkLight,
  });

  // Director signature
  const dirName = data.directorName ?? "Dr. Alex Morgan";
  const dirFlourishSize = fitSize(dirName, sigW, 18, 12, italic);
  const dirFlourishW    = italic.widthOfTextAtSize(dirName, dirFlourishSize);
  page.drawText(dirName, {
    x: sigRightX, y: sigLineY + 3,
    size: dirFlourishSize, font: italic, color: C.navy, opacity: 0.75,
  });
  page.drawLine({
    start: { x: sigRightX, y: sigLineY },
    end:   { x: sigRightX + Math.max(dirFlourishW + 10, sigW * 0.85), y: sigLineY },
    thickness: 0.6, color: C.gold,
  });
  page.drawText(dirName, {
    x: sigRightX, y: sigNameY,
    size: 9.5, font: bold, color: C.inkDark,
  });
  page.drawText("Director, LearnHub Academy", {
    x: sigRightX, y: sigRoleY,
    size: 8, font: helv, color: C.inkLight,
  });

  // ── Footer band content ────────────────────────────────────────────────────────
  // Cert ID in footer
  const certIdText = `CERTIFICATE ID: ${data.certificateId.slice(0, 16).toUpperCase()}`;
  page.drawText(certIdText, {
    x: contentX, y: footerH / 2 - 5,
    size: 7.5, font: helvBold, color: C.gold, opacity: 0.9,
  });

  // Footer tagline centered
  const ftag = "This certificate is issued by LearnHub Academy and validates the holder's successful course completion.";
  const ftagW = helv.widthOfTextAtSize(ftag, 6.5);
  const ftagX = contentX + (contentW - ftagW) / 2;
  if (ftagX > contentX) {
    page.drawText(ftag, {
      x: ftagX, y: footerH / 2 - 5,
      size: 6.5, font: helv, color: C.goldLight, opacity: 0.7,
    });
  }

  // Tiny QR-style pattern bottom-right (inside footer)
  const qrSize = 34;
  const qrX    = bodyW - padX - qrSize;
  const qrY    = 9;
  const cells  = qrCells(data.certificateId);
  const cell   = qrSize / 9;
  for (let i = 0; i < 81; i++) {
    if (!cells[i]) continue;
    const cx2 = qrX + (i % 9) * cell;
    const cy2 = qrY + (8 - Math.floor(i / 9)) * cell;
    page.drawRectangle({ x: cx2, y: cy2, width: cell - 0.3, height: cell - 0.3, color: C.gold });
  }

  // ── Ribbon: "COURSE COMPLETED" rotated text + seal ────────────────────────────
  const rCx = bodyW + ribbonW / 2;

  // Seal centered at 72% ribbon height
  const sealCy = H * 0.72;
  drawSeal(page, rCx, sealCy, helvBold);

  // Rotated "COURSE" above seal
  const course1 = "COURSE";
  const c1W = helvBold.widthOfTextAtSize(course1, 9);
  page.drawText(course1, {
    x: rCx - c1W / 2, y: sealCy + 46,
    size: 9, font: helvBold, color: C.navy,
    rotate: degrees(0),
  });

  // Rotated "COMPLETED" below seal
  const course2 = "COMPLETED";
  const c2W = helvBold.widthOfTextAtSize(course2, 9);
  page.drawText(course2, {
    x: rCx - c2W / 2, y: sealCy - 54,
    size: 9, font: helvBold, color: C.navy,
  });

  // Small gold stars between text and seal
  for (const sy of [sealCy + 35, sealCy - 42]) {
    page.drawCircle({ x: rCx, y: sy, size: 1.5, color: C.navy });
    page.drawCircle({ x: rCx - 6, y: sy, size: 1, color: C.navy });
    page.drawCircle({ x: rCx + 6, y: sy, size: 1, color: C.navy });
  }

  // Thin vertical gold lines framing ribbon text
  page.drawLine({
    start: { x: bodyW + 10, y: H * 0.22 },
    end:   { x: bodyW + 10, y: H * 0.88 },
    thickness: 0.4, color: C.goldDark, opacity: 0.5,
  });
  page.drawLine({
    start: { x: W - 10, y: H * 0.22 },
    end:   { x: W - 10, y: H * 0.88 },
    thickness: 0.4, color: C.goldDark, opacity: 0.5,
  });

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}
