/**
 * Certificate PDF generation using pdf-lib.
 * Design: premium dark theme matching the CoachNest brand (dark bg, orange accents).
 * Landscape A4: 841.89 × 595.28 pt
 */
import { PDFDocument, PDFFont, rgb, StandardFonts } from "pdf-lib";

interface CertificateData {
  recipientName:  string;
  courseTitle:    string;
  instructorName: string;
  issuedAt:       Date;
  certificateId:  string;
}

// ─── Color palette ─────────────────────────────────────────────────────────────
const C = {
  bg:        rgb(0.031, 0.031, 0.031),   // #080808
  card:      rgb(0.067, 0.067, 0.067),   // #111111
  orange:    rgb(0.976, 0.451, 0.086),   // #f97316
  orangeDim: rgb(0.918, 0.345, 0.047),   // #ea580c
  amber:     rgb(0.984, 0.749, 0.141),   // #fbbf24
  white:     rgb(1,     1,     1    ),
  light:     rgb(0.898, 0.898, 0.898),   // #e5e5e5
  muted:     rgb(0.639, 0.639, 0.639),   // #a3a3a3
  subtle:    rgb(0.361, 0.361, 0.361),   // #5c5c5c
};

// ─── Helper: centered text ─────────────────────────────────────────────────────

function drawCentered(
  page: ReturnType<PDFDocument["addPage"]>,
  text: string,
  y: number,
  size: number,
  font: PDFFont,
  color: ReturnType<typeof rgb>,
  width: number,
  opacity = 1
) {
  const tw = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: (width - tw) / 2,
    y,
    size,
    font,
    color,
    opacity,
  });
}

// ─── Helper: split long text into lines ───────────────────────────────────────

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

// ─── Helper: fit font size to max width ───────────────────────────────────────

function fitSize(text: string, maxWidth: number, maxSize: number, minSize: number, font: PDFFont): number {
  let size = maxSize;
  while (font.widthOfTextAtSize(text, size) > maxWidth && size > minSize) {
    size -= 1;
  }
  return size;
}

// ─── Main generator ────────────────────────────────────────────────────────────

export async function generateCertificatePDF(data: CertificateData): Promise<Buffer> {
  const doc  = await PDFDocument.create();
  const page = doc.addPage([841.89, 595.28]);   // landscape A4
  const W    = page.getWidth();
  const H    = page.getHeight();
  const cx   = W / 2;

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold    = await doc.embedFont(StandardFonts.HelveticaBold);

  // ── 1. Background ─────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.bg });

  // ── 2. Outer border ───────────────────────────────────────────────────────
  const bm = 24; // border margin
  page.drawRectangle({
    x: bm, y: bm,
    width:  W - bm * 2,
    height: H - bm * 2,
    borderColor: C.orange,
    borderWidth: 1.5,
    color: C.bg,
    opacity: 0,
    borderOpacity: 0.8,
  });

  // Inner subtle border
  const im = 34;
  page.drawRectangle({
    x: im, y: im,
    width:  W - im * 2,
    height: H - im * 2,
    borderColor: C.orange,
    borderWidth: 0.5,
    color: C.bg,
    opacity: 0,
    borderOpacity: 0.2,
  });

  // ── 3. Orange top accent bar (inside outer border) ────────────────────────
  page.drawRectangle({
    x: bm, y: H - bm - 4,
    width: W - bm * 2,
    height: 4,
    color: C.orange,
    opacity: 1,
  });

  // ── 4. Corner L-ornaments ─────────────────────────────────────────────────
  const cLen   = 22;  // arm length
  const cThick = 2.5; // arm thickness

  // Top-left
  page.drawRectangle({ x: bm,                    y: H - bm - cThick, width: cLen,   height: cThick, color: C.amber });
  page.drawRectangle({ x: bm,                    y: H - bm - cLen,   width: cThick, height: cLen,   color: C.amber });
  // Top-right
  page.drawRectangle({ x: W - bm - cLen,         y: H - bm - cThick, width: cLen,   height: cThick, color: C.amber });
  page.drawRectangle({ x: W - bm - cThick,       y: H - bm - cLen,   width: cThick, height: cLen,   color: C.amber });
  // Bottom-left
  page.drawRectangle({ x: bm,                    y: bm,              width: cLen,   height: cThick, color: C.amber });
  page.drawRectangle({ x: bm,                    y: bm,              width: cThick, height: cLen,   color: C.amber });
  // Bottom-right
  page.drawRectangle({ x: W - bm - cLen,         y: bm,              width: cLen,   height: cThick, color: C.amber });
  page.drawRectangle({ x: W - bm - cThick,       y: bm,              width: cThick, height: cLen,   color: C.amber });

  // ── 5. Brand wordmark ─────────────────────────────────────────────────────
  const brandSize = 26;
  const coach     = "COACH";
  const nest      = "NEST";
  const coachW    = bold.widthOfTextAtSize(coach, brandSize);
  const nestW     = bold.widthOfTextAtSize(nest,  brandSize);
  const brandX    = cx - (coachW + nestW) / 2;
  const brandY    = H - 80;

  page.drawText(coach, { x: brandX,          y: brandY, size: brandSize, font: bold, color: C.white });
  page.drawText(nest,  { x: brandX + coachW, y: brandY, size: brandSize, font: bold, color: C.orange });

  // Flanking decorative lines beside brand
  const brandLineY = brandY + brandSize / 2 - 1;
  const gapToBrand = 14;
  const brandLineLen = 90;
  page.drawLine({ start: { x: brandX - gapToBrand - brandLineLen, y: brandLineY }, end: { x: brandX - gapToBrand, y: brandLineY }, thickness: 1, color: C.orange, opacity: 0.4 });
  page.drawLine({ start: { x: brandX + coachW + nestW + gapToBrand, y: brandLineY }, end: { x: brandX + coachW + nestW + gapToBrand + brandLineLen, y: brandLineY }, thickness: 1, color: C.orange, opacity: 0.4 });

  // ── 6. "CERTIFICATE OF COMPLETION" with flanking lines ────────────────────
  const certTitleText = "CERTIFICATE  OF  COMPLETION";
  const certTitleSize = 11.5;
  const certTitleW    = regular.widthOfTextAtSize(certTitleText, certTitleSize);
  const certTitleY    = H - 106;
  const sideGap       = 16;
  const sideLineLen   = cx - certTitleW / 2 - sideGap - im - 10;

  page.drawText(certTitleText, {
    x: cx - certTitleW / 2, y: certTitleY,
    size: certTitleSize, font: regular, color: C.amber,
  });
  page.drawLine({ start: { x: im + 10, y: certTitleY + certTitleSize / 2 }, end: { x: cx - certTitleW / 2 - sideGap, y: certTitleY + certTitleSize / 2 }, thickness: 0.6, color: C.amber, opacity: 0.5 });
  page.drawLine({ start: { x: cx + certTitleW / 2 + sideGap, y: certTitleY + certTitleSize / 2 }, end: { x: W - im - 10, y: certTitleY + certTitleSize / 2 }, thickness: 0.6, color: C.amber, opacity: 0.5 });

  // ── 7. Main horizontal rule ───────────────────────────────────────────────
  const rule1Y = H - 124;
  page.drawLine({
    start: { x: im + 60, y: rule1Y }, end: { x: W - im - 60, y: rule1Y },
    thickness: 0.5, color: C.orange, opacity: 0.25,
  });

  // ── 8. "This certifies that" ─────────────────────────────────────────────
  const presentsY = H - 160;
  drawCentered(page, "This certifies that", presentsY, 12, regular, C.muted, W);

  // ── 9. Recipient name ─────────────────────────────────────────────────────
  const maxNameSize = 44;
  const nameSize    = fitSize(data.recipientName, W - 160, maxNameSize, 22, bold);
  const nameY       = H - 210;
  drawCentered(page, data.recipientName, nameY, nameSize, bold, C.white, W);

  // Underline below name
  const nameW      = bold.widthOfTextAtSize(data.recipientName, nameSize);
  const nameUnderY = nameY - 6;
  page.drawLine({
    start: { x: cx - nameW / 2, y: nameUnderY },
    end:   { x: cx + nameW / 2, y: nameUnderY },
    thickness: 1.5,
    color: C.orange,
    opacity: 0.7,
  });

  // ── 10. "has successfully completed" ─────────────────────────────────────
  const completedY = H - 252;
  drawCentered(page, "has successfully completed", completedY, 12, regular, C.muted, W);

  // ── 11. Course title (auto-wrap if long) ──────────────────────────────────
  const maxTitleSize = 22;
  const titleFontSize = fitSize(data.courseTitle, W - 160, maxTitleSize, 14, bold);
  const titleLines    = wrapText(data.courseTitle, W - 160, titleFontSize, bold);
  const lineSpacing   = titleFontSize + 6;
  const blockHeight   = titleLines.length * lineSpacing;
  let titleStartY     = H - 284;

  // Adjust start Y if multi-line to keep it centred
  if (titleLines.length > 1) titleStartY += (blockHeight - lineSpacing) / 2;

  for (const [i, line] of titleLines.entries()) {
    drawCentered(page, line, titleStartY - i * lineSpacing, titleFontSize, bold, C.amber, W);
  }

  // ── 12. Second horizontal rule ────────────────────────────────────────────
  const rule2Y = Math.min(titleStartY - blockHeight - 16, H - 330);
  page.drawLine({
    start: { x: im + 60, y: rule2Y }, end: { x: W - im - 60, y: rule2Y },
    thickness: 0.5, color: C.orange, opacity: 0.2,
  });

  // ── 13. Signature area ────────────────────────────────────────────────────
  const sigY       = 88;
  const sigLineLen = 150;
  const sigSpacing = 260;
  const leftSigX   = cx - sigSpacing / 2 - sigLineLen / 2;
  const rightSigX  = cx + sigSpacing / 2 - sigLineLen / 2;

  // Instructor
  page.drawLine({ start: { x: leftSigX, y: sigY }, end: { x: leftSigX + sigLineLen, y: sigY }, thickness: 1, color: C.orange, opacity: 0.5 });

  const instrNameSize = fitSize(data.instructorName, sigLineLen + 20, 11, 8, regular);
  const instrNameW    = regular.widthOfTextAtSize(data.instructorName, instrNameSize);
  page.drawText(data.instructorName, {
    x: leftSigX + (sigLineLen - instrNameW) / 2,
    y: sigY - 16,
    size: instrNameSize, font: regular, color: C.light,
  });
  const instrLabel = "INSTRUCTOR";
  const instrLabelW = regular.widthOfTextAtSize(instrLabel, 8);
  page.drawText(instrLabel, {
    x: leftSigX + (sigLineLen - instrLabelW) / 2,
    y: sigY - 28,
    size: 8, font: regular, color: C.subtle,
  });

  // Platform
  page.drawLine({ start: { x: rightSigX, y: sigY }, end: { x: rightSigX + sigLineLen, y: sigY }, thickness: 1, color: C.orange, opacity: 0.5 });
  const platText = "CoachNest";
  const platW    = bold.widthOfTextAtSize(platText, 11);
  page.drawText(platText, {
    x: rightSigX + (sigLineLen - platW) / 2,
    y: sigY - 16,
    size: 11, font: bold, color: C.orange,
  });
  const platLabel  = "PLATFORM";
  const platLabelW = regular.widthOfTextAtSize(platLabel, 8);
  page.drawText(platLabel, {
    x: rightSigX + (sigLineLen - platLabelW) / 2,
    y: sigY - 28,
    size: 8, font: regular, color: C.subtle,
  });

  // ── 14. Date + Certificate ID ─────────────────────────────────────────────
  const formatted = new Intl.DateTimeFormat("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  }).format(data.issuedAt);

  const dateText = `Issued on ${formatted}`;
  drawCentered(page, dateText, 56, 9, regular, C.subtle, W);

  const certIdText = `Certificate ID: ${data.certificateId}`;
  drawCentered(page, certIdText, 44, 8, regular, C.subtle, W);

  // ── 15. Bottom orange accent bar ──────────────────────────────────────────
  page.drawRectangle({
    x: bm, y: bm,
    width: W - bm * 2,
    height: 4,
    color: C.orange,
    opacity: 0.6,
  });

  // ── 16. Subtle background watermark text ─────────────────────────────────
  const wmText = "COACHNEST";
  const wmSize = 110;
  const wmW    = bold.widthOfTextAtSize(wmText, wmSize);
  page.drawText(wmText, {
    x: (W - wmW) / 2, y: H / 2 - wmSize / 2,
    size: wmSize, font: bold,
    color: C.orange, opacity: 0.025,
  });

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}
