/**
 * Certificate PDF generation using pdf-lib.
 *
 * This is a 1:1 port of public/certificate-preview.html:
 *   - Fixed 900 × 520 pt canvas (same internal canvas as the HTML .cert)
 *   - Navy (#1a2a5e) + white + gold (#c9a84c / #e8c96a) palette
 *   - Double gold border frame with L-corner ornaments + diamond dots
 *   - Navy triangle accent top-left with a gold diagonal
 *   - Sunburst badge top-right (ribbons + ring + "COURSE COMPLETED")
 *   - Body: ornament row · CERTIFICATE · OF COMPLETION · certify label ·
 *           recipient name · completed label · course title · meta lines
 *   - Footer: instructor signature | academy logo + tagline | director signature
 *   - Cert-ID strip at the very bottom
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from "pdf-lib";

interface CertificateData {
  recipientName:   string;
  courseTitle:     string;
  instructorName:  string;
  issuedAt:        Date;
  certificateId:   string;
  directorName?:   string;
  organizationName?: string;
}

// ─── Canvas (matches the HTML .cert: 900 × 520) ────────────────────────────────
const W = 900;
const H = 520;

// ─── Palette (hex values copied from certificate-preview.html) ─────────────────
const C = {
  navy:    rgb(0.1020, 0.1647, 0.3686), // #1a2a5e
  ribbon:  rgb(0.0941, 0.1490, 0.3451), // ~#18265a (ribbon gradient mid)
  gold:    rgb(0.7882, 0.6588, 0.2980), // #c9a84c
  goldLt:  rgb(0.9098, 0.7882, 0.4157), // #e8c96a
  white:   rgb(1, 1, 1),
  ink222:  rgb(0.133, 0.133, 0.133),    // #222 — sig name
  ink666:  rgb(0.400, 0.400, 0.400),    // #666 — completed label
  ink888:  rgb(0.533, 0.533, 0.533),    // #888 — meta / sig role
  ink999:  rgb(0.600, 0.600, 0.600),    // #999 — certify label / tagline
  inkBbb:  rgb(0.733, 0.733, 0.733),    // #bbb — cert id
};

// ─── Text helpers ──────────────────────────────────────────────────────────────

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

/** Width of text rendered with extra per-character letter spacing. */
function spacedWidth(text: string, size: number, font: PDFFont, ls: number): number {
  let w = 0;
  for (const ch of text) w += font.widthOfTextAtSize(ch, size) + ls;
  return w - ls;
}

/** Draw text with CSS-style letter-spacing (ls in points). */
function drawSpaced(
  page: PDFPage, text: string, x: number, baseline: number,
  size: number, font: PDFFont, color: ReturnType<typeof rgb>, ls: number, opacity = 1,
) {
  let cx = x;
  for (const ch of text) {
    page.drawText(ch, { x: cx, y: baseline, size, font, color, opacity });
    cx += font.widthOfTextAtSize(ch, size) + ls;
  }
}

// ─── Shape helpers ─────────────────────────────────────────────────────────────

/** A filled diamond (CSS square rotated 45°) centred at (cx, cy). `s` = square side. */
function drawDiamond(page: PDFPage, cx: number, cy: number, s: number, color: ReturnType<typeof rgb>) {
  const d = (s * Math.SQRT2) / 2;
  page.drawSvgPath(`M ${-d} 0 L 0 ${-d} L ${d} 0 L 0 ${d} Z`, { x: cx, y: cy, color });
}

/** A filled 5-point star centred at (cx, cy) with outer radius R. */
function drawStar(page: PDFPage, cx: number, cy: number, R: number, color: ReturnType<typeof rgb>) {
  const inner = R * 0.382;
  let path = "";
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? R : inner;
    const px = r * Math.cos(ang);
    const py = -r * Math.sin(ang); // svg path is y-down
    path += `${i === 0 ? "M" : "L"} ${px} ${py} `;
  }
  page.drawSvgPath(`${path}Z`, { x: cx, y: cy, color });
}

// ─── L-corner ornament (.corner) ───────────────────────────────────────────────
function drawCorner(page: PDFPage, x: number, y: number, sx: number, sy: number) {
  const len = 36, lw = 2;
  page.drawLine({ start: { x, y }, end: { x: x + sx * len, y },         thickness: lw, color: C.gold });
  page.drawLine({ start: { x, y }, end: { x,             y: y + sy * len }, thickness: lw, color: C.gold });
}

// ─── Sunburst badge (.badge-wrap) ──────────────────────────────────────────────
function drawBadge(page: PDFPage, helvBold: PDFFont) {
  // badge-wrap: width 96, right:32, top:3  →  disc centre
  const cx = W - 32 - 48;            // 820
  const discTop = 3 + 34 - 9;        // ribbons (34) tuck -9 under disc
  const cy = H - (discTop + 48);     // disc centre, R = 48
  const R  = 48;

  // ── Ribbon tails (drawn behind the disc) ──
  // badge-ribbons: width 48, centred; two tails, gap 5, height 34, chevron @76%
  const tailW = (48 - 5) / 2;        // 21.5
  const ribLeft = cx - 24;
  for (let i = 0; i < 2; i++) {
    const x0 = ribLeft + i * (tailW + 5);
    const x1 = x0 + tailW;
    const yTop = 3, yChev = 3 + 34 * 0.76, yPt = 3 + 34;
    page.drawSvgPath(
      `M ${x0} ${yTop} L ${x1} ${yTop} L ${x1} ${yChev} L ${(x0 + x1) / 2} ${yPt} L ${x0} ${yChev} Z`,
      { x: 0, y: H, color: C.ribbon },
    );
  }

  // ── Sunburst: gold disc + alternating lighter wedges ──
  page.drawCircle({ x: cx, y: cy, size: R, color: C.gold });
  const segs = 52;
  for (let i = 0; i < segs; i += 2) {
    const a1 = (i / segs) * Math.PI * 2;
    const a2 = ((i + 1) / segs) * Math.PI * 2;
    page.drawSvgPath(
      `M 0 0 L ${R * Math.cos(a1)} ${-R * Math.sin(a1)} L ${R * Math.cos(a2)} ${-R * Math.sin(a2)} Z`,
      { x: cx, y: cy, color: C.goldLt },
    );
  }

  // ── Navy ring + inner hairline ──
  page.drawCircle({ x: cx, y: cy, size: 41, color: C.navy, borderColor: C.goldLt, borderWidth: 2.5 });
  page.drawCircle({ x: cx, y: cy, size: 35, borderColor: C.goldLt, borderWidth: 1, borderOpacity: 0.38 });

  // ── Ring content: COURSE · ✓ · ★★★ · COMPLETED ──
  const labelSize = 6, labelLs = labelSize * 0.13;
  const top = "COURSE", bot = "COMPLETED";
  drawSpaced(page, top, cx - spacedWidth(top, labelSize, helvBold, labelLs) / 2,
    cy + 21, labelSize, helvBold, C.goldLt, labelLs);
  drawSpaced(page, bot, cx - spacedWidth(bot, labelSize, helvBold, labelLs) / 2,
    cy - 26, labelSize, helvBold, C.goldLt, labelLs);

  // Checkmark (drawn — ✓ is outside WinAnsi)
  page.drawLine({ start: { x: cx - 7, y: cy + 4 },   end: { x: cx - 2.5, y: cy - 0.5 }, thickness: 2.4, color: C.goldLt });
  page.drawLine({ start: { x: cx - 2.5, y: cy - 0.5 }, end: { x: cx + 7, y: cy + 9 },   thickness: 2.4, color: C.goldLt });

  // Three stars (drawn — ★ is outside WinAnsi)
  for (let i = 0; i < 3; i++) drawStar(page, cx + (i - 1) * 7, cy - 11, 2.6, C.goldLt);
}

// ─── Top ornament row (.ornament-row) ──────────────────────────────────────────
function drawOrnamentRow(page: PDFPage, cx: number, cy: number) {
  page.drawLine({ start: { x: cx - 100, y: cy }, end: { x: cx - 17, y: cy }, thickness: 1, color: C.gold });
  page.drawLine({ start: { x: cx + 17,  y: cy }, end: { x: cx + 100, y: cy }, thickness: 1, color: C.gold });
  page.drawCircle({ x: cx - 10, y: cy, size: 1.5, color: C.gold });
  page.drawCircle({ x: cx + 10, y: cy, size: 1.5, color: C.gold });
  drawDiamond(page, cx, cy, 5, C.gold);
}

// ─── Main generator ────────────────────────────────────────────────────────────

export async function generateCertificatePDF(data: CertificateData): Promise<Buffer> {
  const doc  = await PDFDocument.create();
  const page = doc.addPage([W, H]);

  const regular  = await doc.embedFont(StandardFonts.TimesRoman);
  const bold     = await doc.embedFont(StandardFonts.TimesRomanBold);
  const italic   = await doc.embedFont(StandardFonts.TimesRomanItalic); // ≈ Dancing Script
  const helv     = await doc.embedFont(StandardFonts.Helvetica);        // ≈ Montserrat
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const org = data.organizationName ?? "Coachnest";
  const cx  = W / 2;

  // Convert an HTML top-edge + font size into a PDF baseline.
  const baseAt = (htmlTop: number, size: number, k = 0.74) => H - (htmlTop + size * k);

  // ── White background ──────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.white });

  // ── Navy triangle accent — top-left ─────────────────────────────────────────────
  page.drawSvgPath("M 0 0 L 80 0 L 0 80 Z", { x: 0, y: H, color: C.navy });
  page.drawLine({ start: { x: 76, y: H - 3 }, end: { x: 3, y: H - 76 }, thickness: 1.6, color: C.gold });

  // ── Double gold border frame (.frame) ───────────────────────────────────────────
  page.drawRectangle({ x: 11, y: 11, width: W - 22, height: H - 22, borderColor: C.gold, borderWidth: 1.8 });
  page.drawRectangle({ x: 17, y: 17, width: W - 34, height: H - 34, borderColor: C.gold, borderWidth: 0.6, borderOpacity: 0.42 });

  // ── L-corner ornaments + diamond dots (.corner / .c-dot) ─────────────────────────
  drawCorner(page, 11,     H - 11, +1, -1);
  drawCorner(page, W - 11, H - 11, -1, -1);
  drawCorner(page, 11,     11,     +1, +1);
  drawCorner(page, W - 11, 11,     -1, +1);
  drawDiamond(page, 10.5,     H - 10.5, 7, C.gold);
  drawDiamond(page, W - 10.5, H - 10.5, 7, C.gold);
  drawDiamond(page, 10.5,     10.5,     7, C.gold);
  drawDiamond(page, W - 10.5, 10.5,     7, C.gold);

  // ── Sunburst badge — top-right ───────────────────────────────────────────────────
  drawBadge(page, helvBold);

  // ════════════════════════════════════════════════════════════════════════════════
  // BODY — vertically centred inside the content region (html y 90 … 376)
  // ════════════════════════════════════════════════════════════════════════════════
  const courseMaxW = 700;
  const courseSize  = fitSize(data.courseTitle, courseMaxW, 23, 13, bold);
  const courseLines = wrapText(data.courseTitle, courseMaxW, courseSize, bold).slice(0, 2);
  const courseH     = courseLines.length * courseSize * 1.25;

  const nameMaxW = W * 0.72;
  const nameSize = fitSize(data.recipientName, nameMaxW, 54, 26, italic);
  const nameH    = nameSize * 1.05;

  // Stack height = fixed parts + name + course; centre it in the 286pt region.
  const totalH = 151.7 + nameH + courseH;
  let t = 90 + (286 - totalH) / 2;            // html y — top of the stack

  // 1 · ornament row
  drawOrnamentRow(page, cx, H - (t + 2.5));
  t += 5 + 3;

  // 2 · CERTIFICATE
  {
    const size = 48, ls = size * 0.08;
    const txt = "CERTIFICATE";
    drawSpaced(page, txt, cx - spacedWidth(txt, size, bold, ls) / 2,
      baseAt(t, size, 0.78), size, bold, C.navy, ls);
  }
  t += 48 + 1;

  // 3 · OF COMPLETION (gold rules + tracked caps, 560pt wide)
  {
    const size = 13, ls = size * 0.30;
    const txt = "OF COMPLETION";
    const txtW = spacedWidth(txt, size, helvBold, ls);
    const ruleW = (560 - txtW - 20) / 2;
    const cyRule = H - (t + 6.5);
    page.drawLine({ start: { x: cx - 280, y: cyRule }, end: { x: cx - 280 + ruleW, y: cyRule }, thickness: 1.5, color: C.gold });
    page.drawLine({ start: { x: cx + 280 - ruleW, y: cyRule }, end: { x: cx + 280, y: cyRule }, thickness: 1.5, color: C.gold });
    drawSpaced(page, txt, cx - txtW / 2, cyRule - size * 0.34, size, helvBold, C.gold, ls);
  }
  t += 13 + 10;

  // 4 · THIS IS TO CERTIFY THAT
  {
    const size = 9.5, ls = size * 0.18;
    const txt = "THIS IS TO CERTIFY THAT";
    drawSpaced(page, txt, cx - spacedWidth(txt, size, helv, ls) / 2,
      baseAt(t, size), size, helv, C.ink999, ls);
  }
  t += 9.5 + 4;

  // 5 · Recipient name (script)
  {
    const w = italic.widthOfTextAtSize(data.recipientName, nameSize);
    page.drawText(data.recipientName, { x: cx - w / 2, y: baseAt(t, nameSize, 0.70), size: nameSize, font: italic, color: C.navy });
  }
  t += nameH + 8;

  // 6 · has successfully completed the course
  {
    const size = 10, txt = "has successfully completed the course";
    const w = regular.widthOfTextAtSize(txt, size);
    page.drawText(txt, { x: cx - w / 2, y: baseAt(t, size), size, font: regular, color: C.ink666 });
  }
  t += 10 + 3;

  // 7 · Course title
  for (const line of courseLines) {
    const w = bold.widthOfTextAtSize(line, courseSize);
    page.drawText(line, { x: cx - w / 2, y: baseAt(t, courseSize, 0.78), size: courseSize, font: bold, color: C.navy });
    t += courseSize * 1.25;
  }
  t += 3;

  // 8 · meta lines — offered by / issued on
  {
    const size = 9;
    const offStr  = `offered by ${org}`;
    const dateStr = `Issued on ${new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(data.issuedAt)}`;
    const offW  = regular.widthOfTextAtSize(offStr, size);
    const dateW = regular.widthOfTextAtSize(dateStr, size);
    page.drawText(offStr,  { x: cx - offW / 2,  y: baseAt(t, size), size, font: regular, color: C.ink888 });
    t += 17.1;
    page.drawText(dateStr, { x: cx - dateW / 2, y: baseAt(t, size), size, font: regular, color: C.ink888 });
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // FOOTER (.cert-footer) — html y 386 … 494
  // ════════════════════════════════════════════════════════════════════════════════
  const initials = (n: string) =>
  n
    .trim()
    .split(/\s+/)
    .map((w) => `${w.charAt(0).toUpperCase()}.`)
    .join(" ");

const sigScriptY = H - 432;
const sigNameY = H - 455;
const sigRoleY = H - 468;

// Left — academy logo + tagline
{
  let logo: PDFImage | undefined;

  try {
    logo = await doc.embedPng(
      await fs.readFile(path.join(process.cwd(), "public", "logo.png"))
    );
  } catch {
    /* logo optional */
  }

  const leftX = 64;

  if (logo) {
    const lw = 120;
    const lh = (logo.height / logo.width) * lw;

    page.drawImage(logo, {
      x: leftX,
      y: H - (425.5 + lh),
      width: lw,
      height: lh,
    });
  } else {
    const name = org.toUpperCase();

    page.drawText(name, {
      x: leftX,
      y: H - 442,
      size: 13,
      font: helvBold,
      color: C.navy,
    });
  }

  const tag = "Empowering Careers, Building Futures";
  const tagLs = 7 * 0.07;

  drawSpaced(
    page,
    tag,
    leftX,
    H - 458,
    7,
    helv,
    C.ink999,
    tagLs
  );
}

// Right — instructor
{
  const right = W - 64;

  const sig = initials(data.instructorName);

  page.drawText(sig, {
    x: right - italic.widthOfTextAtSize(sig, 30),
    y: sigScriptY,
    size: 30,
    font: italic,
    color: C.navy,
  });

  const nameW = spacedWidth(
    data.instructorName,
    12,
    helvBold,
    12 * 0.05
  );

  drawSpaced(
    page,
    data.instructorName,
    right - nameW,
    sigNameY,
    12,
    helvBold,
    C.ink222,
    12 * 0.05
  );

  const role = "Instructor";

  const roleW = spacedWidth(role, 9, helv, 9 * 0.06);

  drawSpaced(
    page,
    role,
    right - roleW,
    sigRoleY,
    9,
    helv,
    C.ink888,
    9 * 0.06
  );
}

  // ════════════════════════════════════════════════════════════════════════════════
  // CERT-ID STRIP (.cert-id-bar) — html y 494 … 520
  // ════════════════════════════════════════════════════════════════════════════════
  // page.drawLine({ start: { x: 18, y: H - 494 }, end: { x: W - 18, y: H - 494 }, thickness: 1, color: C.gold, opacity: 0.18 });
  // {
  //   const idStr = `Certificate ID: ${data.certificateId.slice(0, 24).toUpperCase()}`;
  //   drawSpaced(page, idStr, 64, baseAt(503.5, 7), 7, helv, C.inkBbb, 7 * 0.10);
  // }

  return Buffer.from(await doc.save());
}
