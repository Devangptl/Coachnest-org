/**
 * Certificate PDF generation using pdf-lib.
 *
 * Design matches the reference UI:
 *   - A4 landscape (841.89 × 595.28 pt)
 *   - Navy (#1a2a5e) + white + gold (#c9a84c) palette
 *   - Double gold border frame with L-corner ornaments + diamond dots
 *   - Navy triangle accent top-left
 *   - Sunburst circular badge top-right with "COURSE COMPLETED" + ribbon tails
 *   - Large "CERTIFICATE" serif heading
 *   - "OF COMPLETION" flanked by gold rules
 *   - Recipient name in large italic (script-style)
 *   - Course title in bold serif
 *   - Three-column footer: left sig | academy seal | right sig
 *   - Certificate ID at very bottom
 *   - Guilloche ellipse watermark behind body
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
  organizationName?: string;
}

// ─── Palette ───────────────────────────────────────────────────────────────────
const C = {
  navy:     rgb(0.102, 0.165, 0.369),  // #1a2a5e
  navyDark: rgb(0.071, 0.125, 0.376),  // #122060
  gold:     rgb(0.788, 0.659, 0.298),  // #c9a84c
  goldLt:   rgb(0.910, 0.788, 0.416),  // #e8c96a
  white:    rgb(1, 1, 1),
  offWhite: rgb(0.980, 0.976, 0.965),
  ink:      rgb(0.133, 0.133, 0.133),
  ink2:     rgb(0.333, 0.333, 0.333),
  ink3:     rgb(0.533, 0.533, 0.533),
  ink4:     rgb(0.667, 0.667, 0.667),
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fitSize(text: string, maxWidth: number, max: number, min: number, font: PDFFont): number {
  let s = max;
  while (font.widthOfTextAtSize(text, s) > maxWidth && s > min) s -= 0.5;
  return s;
}

function wrapText(text: string, maxWidth: number, size: number, font: PDFFont): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(t, size) > maxWidth && line) { lines.push(line); line = w; }
    else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

function qrCells(seed: string): boolean[] {
  const SIZE = 9;
  const cells: boolean[] = new Array(SIZE * SIZE);
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = 0; i < cells.length; i++) { h = (h * 1664525 + 1013904223) >>> 0; cells[i] = (h & 1) === 1; }
  const corners: [number, number][] = [[0, 0], [0, SIZE - 1], [SIZE - 1, 0]];
  for (const [cx, cy] of corners) {
    for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) {
      const x = cx === 0 ? dx : cx - 2 + dx;
      const y = cy === 0 ? dy : cy - 2 + dy;
      cells[y * SIZE + x] = dx === 0 || dy === 0 || dx === 2 || dy === 2;
    }
  }
  return cells;
}

// ─── Corner ornament (L-shape + diamond) ──────────────────────────────────────
function drawCorner(page: PDFPage, x: number, y: number, flipX: boolean, flipY: boolean) {
  const len = 32; const lw = 1.8;
  const sx = flipX ? -1 : 1; const sy = flipY ? -1 : 1;
  page.drawLine({ start: { x, y }, end: { x: x + sx * len, y }, thickness: lw, color: C.gold });
  page.drawLine({ start: { x, y }, end: { x, y: y + sy * len }, thickness: lw, color: C.gold });
  const ox = x + sx * 5; const oy = y + sy * 5;
  page.drawLine({ start: { x: ox, y: oy }, end: { x: ox + sx * (len - 9), y: oy }, thickness: 0.5, color: C.gold, opacity: 0.55 });
  page.drawLine({ start: { x: ox, y: oy }, end: { x: ox, y: oy + sy * (len - 9) }, thickness: 0.5, color: C.gold, opacity: 0.55 });
  const ds = 4;
  page.drawRectangle({ x: x - ds * 0.5, y: y - ds * 0.5, width: ds, height: ds, color: C.gold, rotate: degrees(45) });
}

// ─── Guilloche watermark ───────────────────────────────────────────────────────
function drawGuilloche(page: PDFPage, cx: number, cy: number) {
  for (let i = 0; i < 16; i++) {
    page.drawEllipse({
      x: cx, y: cy,
      xScale: 210 - i * 8, yScale: 140 - i * 5.5,
      borderColor: C.navy, borderWidth: 0.25, borderOpacity: 0.07,
      rotate: degrees(i * 11),
      color: C.white, opacity: 0,
    });
  }
}

// ─── Sunburst badge ────────────────────────────────────────────────────────────
function drawBadge(page: PDFPage, cx: number, cy: number, r: number, bold: PDFFont, helv: PDFFont) {
  // Sunburst rays (alternating gold shades)
  const rays = 28;
  for (let i = 0; i < rays; i++) {
    const a1 = (i / rays) * Math.PI * 2;
    const a2 = ((i + 0.5) / rays) * Math.PI * 2;
    const aColor = i % 2 === 0 ? C.goldLt : C.gold;
    const pts = [
      { x: cx, y: cy },
      { x: cx + Math.cos(a1) * r, y: cy + Math.sin(a1) * r },
      { x: cx + Math.cos(a2) * r, y: cy + Math.sin(a2) * r },
    ];
    // Draw thin wedge approximation as a very thin triangle via lines
    page.drawLine({ start: { x: cx, y: cy }, end: pts[1], thickness: 0.9, color: aColor });
    page.drawLine({ start: { x: cx, y: cy }, end: pts[2], thickness: 0.9, color: aColor });
  }

  // Outer ring fill
  page.drawCircle({ x: cx, y: cy, size: r * 0.88, color: C.navyDark, borderColor: C.goldLt, borderWidth: 1.4 });
  // Inner ring line
  page.drawCircle({ x: cx, y: cy, size: r * 0.76, color: C.navyDark, borderColor: C.gold, borderWidth: 0.5, borderOpacity: 0.55 });

  // "COURSE" top
  const courseStr = "COURSE";
  const csW = helv.widthOfTextAtSize(courseStr, 5.5);
  page.drawText(courseStr, { x: cx - csW / 2, y: cy + r * 0.42, size: 5.5, font: helv, color: C.goldLt });

  // Checkmark / star cluster center
  const star = "★"; // ★
  const stW = bold.widthOfTextAtSize(star, 18);
  page.drawText(star, { x: cx - stW / 2, y: cy - 6, size: 18, font: bold, color: C.goldLt });

  // Three small star dots
  const dotStr = "* * *";
  const dotW = helv.widthOfTextAtSize(dotStr, 5);
  page.drawText(dotStr, { x: cx - dotW / 2, y: cy - r * 0.38, size: 5, font: helv, color: C.gold });

  // "COMPLETED" bottom
  const compStr = "COMPLETED";
  const compW = helv.widthOfTextAtSize(compStr, 5.5);
  page.drawText(compStr, { x: cx - compW / 2, y: cy - r * 0.56, size: 5.5, font: helv, color: C.goldLt });
}

// ─── Academy seal (center footer) ─────────────────────────────────────────────
function drawAcademySeal(page: PDFPage, cx: number, cy: number, bold: PDFFont, regular: PDFFont, orgName: string) {
  page.drawCircle({ x: cx, y: cy, size: 20, color: C.navy, borderColor: C.gold, borderWidth: 1.2 });
  page.drawCircle({ x: cx, y: cy, size: 16, color: C.navy, borderColor: C.gold, borderWidth: 0.4, borderOpacity: 0.45 });
  const letter = orgName.charAt(0).toUpperCase();
  const lw = bold.widthOfTextAtSize(letter, 18);
  page.drawText(letter, { x: cx - lw / 2, y: cy - 6, size: 18, font: bold, color: C.gold });

  const nameStr = orgName.toUpperCase();
  const nw = bold.widthOfTextAtSize(nameStr, 6);
  page.drawText(nameStr, { x: cx - nw / 2, y: cy - 26, size: 6, font: bold, color: C.navy });
  const sub = "Empowering Careers, Building Futures";
  const sw = regular.widthOfTextAtSize(sub, 5);
  page.drawText(sub, { x: cx - sw / 2, y: cy - 35, size: 5, font: regular, color: C.ink4 });
}

// ─── Main generator ────────────────────────────────────────────────────────────

export async function generateCertificatePDF(data: CertificateData): Promise<Buffer> {
  const doc  = await PDFDocument.create();
  const page = doc.addPage([841.89, 595.28]);
  const W = page.getWidth();
  const H = page.getHeight();

  const regular  = await doc.embedFont(StandardFonts.TimesRoman);
  const bold     = await doc.embedFont(StandardFonts.TimesRomanBold);
  const italic   = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const helv     = await doc.embedFont(StandardFonts.Helvetica);
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const org = data.organizationName ?? "Tech Academy";

  // ── White background ──────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.white });

  // ── Guilloche watermark ────────────────────────────────────────────────────────
  drawGuilloche(page, W * 0.5, H * 0.52);

  // ── Double gold border frame ───────────────────────────────────────────────────
  const bm = 12;
  page.drawRectangle({ x: bm, y: bm, width: W - bm * 2, height: H - bm * 2, color: C.white, opacity: 0, borderColor: C.gold, borderWidth: 1.8 });
  page.drawRectangle({ x: bm + 5, y: bm + 5, width: W - (bm + 5) * 2, height: H - (bm + 5) * 2, color: C.white, opacity: 0, borderColor: C.gold, borderWidth: 0.5, borderOpacity: 0.5 });

  // ── Corner ornaments ───────────────────────────────────────────────────────────
  const co = bm + 2;
  drawCorner(page, co,     H - co, false, false);
  drawCorner(page, W - co, H - co, true,  false);
  drawCorner(page, co,     co,     false, true);
  drawCorner(page, W - co, co,     true,  true);

  // ── Navy triangle top-left ─────────────────────────────────────────────────────
  // Drawn as SVG path
  const triSize = 68;
  page.drawSvgPath(`M 0 ${triSize} L 0 0 L ${triSize} 0 Z`, { x: 0, y: H - triSize, color: C.navyDark });
  // Gold diagonal line across the triangle hypotenuse
  page.drawLine({
    start: { x: 6,          y: H - triSize + 3 },
    end:   { x: triSize - 3, y: H - 6 },
    thickness: 1.2, color: C.gold,
  });

  // ── Sunburst badge top-right ───────────────────────────────────────────────────
  const badgeR  = 36;
  const badgeCx = W - 78;
  const badgeCy = H - 14;   // partially above the page → clipped naturally at top
  // Ribbon tails (two small navy chevron-tipped strips)
  for (let i = 0; i < 2; i++) {
    const rx = badgeCx - 8 + i * 14;
    const ry = badgeCy - badgeR - 1;
    const rh = 26;
    const rw = 10;
    page.drawRectangle({ x: rx, y: ry - rh, width: rw, height: rh, color: C.navyDark });
    page.drawSvgPath(`M 0 0 L ${rw} 0 L ${rw / 2} -7 Z`, { x: rx, y: ry - rh, color: C.navy });
  }
  drawBadge(page, badgeCx, badgeCy, badgeR, bold, helvBold);

  // ── Logo (optional) ────────────────────────────────────────────────────────────
  try {
    const logoBytes = await fs.readFile(path.join(process.cwd(), "public", "logo.png"));
    const logo = await doc.embedPng(logoBytes);
    const lh = 28; const lw2 = (logo.width / logo.height) * lh;
    page.drawImage(logo, { x: 22, y: H - 22 - lh, width: lw2, height: lh });
  } catch { /* skip if missing */ }

  // ── Content vertical layout ────────────────────────────────────────────────────
  // Work top-down from a starting Y
  let y = H - 44;
  const cx = W / 2;  // center X for centred text

  // Top small ornament row (diamond + lines)
  const oDiag = 5; const oLineLen = 22;
  page.drawRectangle({ x: cx - oDiag / 2, y: y - oDiag / 2, width: oDiag, height: oDiag, color: C.gold, rotate: degrees(45) });
  page.drawLine({ start: { x: cx - oDiag / 2 - oLineLen, y: y }, end: { x: cx - oDiag / 2 - 2, y: y }, thickness: 0.8, color: C.gold });
  page.drawLine({ start: { x: cx + oDiag / 2 + 2, y: y }, end: { x: cx + oDiag / 2 + oLineLen, y: y }, thickness: 0.8, color: C.gold });

  y -= 14;

  // "CERTIFICATE" — largest element
  const certWord = "CERTIFICATE";
  const certSize = 60;
  const certW = bold.widthOfTextAtSize(certWord, certSize);
  page.drawText(certWord, { x: cx - certW / 2, y, size: certSize, font: bold, color: C.navy });
  y -= certSize + 2;

  // "OF COMPLETION" with gold lines
  const ofStr = "OF  COMPLETION";
  const ofSize = 11;
  const ofW = helvBold.widthOfTextAtSize(ofStr, ofSize);
  const lineGap = 10; const lineLen = (W * 0.36 - ofW / 2 - lineGap);
  page.drawLine({ start: { x: cx - ofW / 2 - lineGap - lineLen, y: y + ofSize * 0.4 }, end: { x: cx - ofW / 2 - lineGap, y: y + ofSize * 0.4 }, thickness: 1, color: C.gold });
  page.drawText(ofStr, { x: cx - ofW / 2, y, size: ofSize, font: helvBold, color: C.gold });
  page.drawLine({ start: { x: cx + ofW / 2 + lineGap, y: y + ofSize * 0.4 }, end: { x: cx + ofW / 2 + lineGap + lineLen, y: y + ofSize * 0.4 }, thickness: 1, color: C.gold });
  y -= ofSize + 18;

  // "THIS IS TO CERTIFY THAT"
  const certifyStr = "THIS IS TO CERTIFY THAT";
  const csiz = 8;
  const certifyW = helv.widthOfTextAtSize(certifyStr, csiz);
  page.drawText(certifyStr, { x: cx - certifyW / 2, y, size: csiz, font: helv, color: C.ink4 });
  y -= csiz + 14;

  // Recipient name (large italic)
  const nameMax = W * 0.72;
  const nameSize = fitSize(data.recipientName, nameMax, 44, 24, italic);
  const nameW = italic.widthOfTextAtSize(data.recipientName, nameSize);
  page.drawText(data.recipientName, { x: cx - nameW / 2, y, size: nameSize, font: italic, color: C.navy });
  y -= nameSize + 16;

  // "has successfully completed the course"
  const bodyStr = "has successfully completed the course";
  const bsiz = 9;
  const bodyW2 = regular.widthOfTextAtSize(bodyStr, bsiz);
  page.drawText(bodyStr, { x: cx - bodyW2 / 2, y, size: bsiz, font: regular, color: C.ink3 });
  y -= bsiz + 8;

  // Course title
  const courseMaxW = W * 0.66;
  const courseSize = fitSize(data.courseTitle, courseMaxW, 18, 11, bold);
  const courseLines = wrapText(data.courseTitle, courseMaxW, courseSize, bold).slice(0, 2);
  for (const line of courseLines) {
    const lw3 = bold.widthOfTextAtSize(line, courseSize);
    page.drawText(line, { x: cx - lw3 / 2, y, size: courseSize, font: bold, color: C.navy });
    y -= courseSize + 4;
  }

  // "offered by …"
  const offStr = `offered by ${org}`;
  const offSiz = 8.5;
  const offW = regular.widthOfTextAtSize(offStr, offSiz);
  page.drawText(offStr, { x: cx - offW / 2, y, size: offSiz, font: regular, color: C.ink4 });
  y -= offSiz + 5;

  // Issue date
  const dateStr = `Issued on ${new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(data.issuedAt)}`;
  const dateSiz = 8.5;
  const dateW2 = regular.widthOfTextAtSize(dateStr, dateSiz);
  page.drawText(dateStr, { x: cx - dateW2 / 2, y, size: dateSiz, font: regular, color: C.ink4 });

  // ── Footer ─────────────────────────────────────────────────────────────────────
  const footerY   = 80;
  const sigLineY  = footerY + 26;
  const sigNameY  = footerY + 12;
  const sigRoleY  = footerY;
  const sigW      = W * 0.25;
  const sigLeftX  = bm + 38;
  const sigRightX = W - bm - 38 - sigW;

  // Left sig
  const instrFlourish = data.instructorName.split(" ").map(p => p.charAt(0).toUpperCase() + ".").join(" ");
  const ifSz = fitSize(instrFlourish, sigW, 20, 12, italic);
  page.drawText(instrFlourish, { x: sigLeftX, y: sigLineY + 4, size: ifSz, font: italic, color: C.navy, opacity: 0.80 });
  page.drawLine({ start: { x: sigLeftX, y: sigLineY }, end: { x: sigLeftX + sigW * 0.9, y: sigLineY }, thickness: 0.7, color: C.ink4 });
  const iNameSz = 8.5;
  page.drawText(data.instructorName, { x: sigLeftX, y: sigNameY, size: iNameSz, font: helvBold, color: C.ink });
  page.drawText("Instructor", { x: sigLeftX, y: sigRoleY, size: 7.5, font: helv, color: C.ink4 });

  // Right sig
  const dirName = data.directorName ?? "Program Director";
  const dirFlourish = dirName.split(" ").map(p => p.charAt(0).toUpperCase() + ".").join(" ");
  const dfSz = fitSize(dirFlourish, sigW, 20, 12, italic);
  const dfW  = italic.widthOfTextAtSize(dirFlourish, dfSz);
  page.drawText(dirFlourish, { x: sigRightX + sigW - dfW, y: sigLineY + 4, size: dfSz, font: italic, color: C.navy, opacity: 0.80 });
  page.drawLine({ start: { x: sigRightX + sigW * 0.1, y: sigLineY }, end: { x: sigRightX + sigW, y: sigLineY }, thickness: 0.7, color: C.ink4 });
  const dNameW = helvBold.widthOfTextAtSize(dirName, 8.5);
  page.drawText(dirName, { x: sigRightX + sigW - dNameW, y: sigNameY, size: 8.5, font: helvBold, color: C.ink });
  const dRole = "Program Director";
  const dRoleW = helv.widthOfTextAtSize(dRole, 7.5);
  page.drawText(dRole, { x: sigRightX + sigW - dRoleW, y: sigRoleY, size: 7.5, font: helv, color: C.ink4 });

  // Center academy seal
  drawAcademySeal(page, cx, footerY + 14, helvBold, regular, org);

  // ── Certificate ID bottom-left ────────────────────────────────────────────────
  const certIdStr = `Certificate ID: ${data.certificateId.slice(0, 16).toUpperCase()}`;
  page.drawText(certIdStr, { x: bm + 14, y: bm + 6, size: 6.5, font: helv, color: C.ink4 });

  // ── Mini QR bottom-right ───────────────────────────────────────────────────────
  const qrSz = 28; const qrX = W - bm - 14 - qrSz; const qrY2 = bm + 6;
  const cells = qrCells(data.certificateId);
  const cell  = qrSz / 9;
  for (let i = 0; i < 81; i++) {
    if (!cells[i]) continue;
    page.drawRectangle({ x: qrX + (i % 9) * cell, y: qrY2 + (8 - Math.floor(i / 9)) * cell, width: cell - 0.2, height: cell - 0.2, color: C.navy });
  }

  return Buffer.from(await doc.save());
}
