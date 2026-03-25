/**
 * Certificate PDF generation using pdf-lib (pure JS, no WASM dependencies).
 * Called server-side in the /api/certificates/[courseId] route.
 */
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

interface CertificateData {
  recipientName: string;
  courseTitle: string;
  instructorName: string;
  issuedAt: Date;
  certificateId: string;
}

export async function generateCertificatePDF(data: CertificateData): Promise<Buffer> {
  const doc = await PDFDocument.create();

  // Landscape A4: 841.89 x 595.28
  const page = doc.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();

  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);

  // ── Colors ──
  const bgColor = rgb(15 / 255, 12 / 255, 41 / 255);      // #0f0c29
  const accent = rgb(124 / 255, 58 / 255, 237 / 255);       // #7c3aed
  const lightPurple = rgb(167 / 255, 139 / 255, 250 / 255);  // #a78bfa
  const softPurple = rgb(196 / 255, 181 / 255, 253 / 255);   // #c4b5fd
  const white = rgb(1, 1, 1);

  // ── Background ──
  page.drawRectangle({
    x: 0, y: 0, width, height,
    color: bgColor,
  });

  // ── Decorative border ──
  const bm = 20; // border margin
  page.drawRectangle({
    x: bm, y: bm, width: width - bm * 2, height: height - bm * 2,
    borderColor: accent,
    borderWidth: 2,
    color: rgb(0, 0, 0), opacity: 0,
    borderOpacity: 1,
  });

  // ── Corner accents (small squares) ──
  const cs = 8;
  for (const [cx, cy] of [[bm, bm], [bm, height - bm - cs], [width - bm - cs, bm], [width - bm - cs, height - bm - cs]]) {
    page.drawRectangle({ x: cx, y: cy, width: cs, height: cs, color: accent });
  }

  // ── Header: LEARNHUB ──
  const logoText = "LEARNHUB";
  const logoSize = 28;
  const logoWidth = helveticaBold.widthOfTextAtSize(logoText, logoSize);
  page.drawText(logoText, {
    x: (width - logoWidth) / 2,
    y: height - 80,
    size: logoSize,
    font: helveticaBold,
    color: lightPurple,
  });

  // ── Subtitle: Certificate of Completion ──
  const subtitle = "CERTIFICATE OF COMPLETION";
  const subSize = 11;
  const subWidth = helvetica.widthOfTextAtSize(subtitle, subSize);
  page.drawText(subtitle, {
    x: (width - subWidth) / 2,
    y: height - 100,
    size: subSize,
    font: helvetica,
    color: softPurple,
  });

  // ── Divider ──
  const divY = height - 120;
  page.drawLine({
    start: { x: 100, y: divY },
    end: { x: width - 100, y: divY },
    thickness: 1,
    color: accent,
    opacity: 0.4,
  });

  // ── "This is to certify that" ──
  const presentsText = "This is to certify that";
  const presentsSize = 13;
  const presentsWidth = helvetica.widthOfTextAtSize(presentsText, presentsSize);
  page.drawText(presentsText, {
    x: (width - presentsWidth) / 2,
    y: height - 160,
    size: presentsSize,
    font: helvetica,
    color: lightPurple,
  });

  // ── Recipient name ──
  const nameSize = 36;
  const nameWidth = helveticaBold.widthOfTextAtSize(data.recipientName, nameSize);
  page.drawText(data.recipientName, {
    x: (width - nameWidth) / 2,
    y: height - 210,
    size: nameSize,
    font: helveticaBold,
    color: white,
  });

  // ── "has successfully completed the course" ──
  const compText = "has successfully completed the course";
  const compSize = 13;
  const compWidth = helvetica.widthOfTextAtSize(compText, compSize);
  page.drawText(compText, {
    x: (width - compWidth) / 2,
    y: height - 240,
    size: compSize,
    font: helvetica,
    color: softPurple,
  });

  // ── Course title ──
  const titleSize = 22;
  const titleWidth = helveticaBold.widthOfTextAtSize(data.courseTitle, titleSize);
  page.drawText(data.courseTitle, {
    x: (width - titleWidth) / 2,
    y: height - 280,
    size: titleSize,
    font: helveticaBold,
    color: lightPurple,
  });

  // ── Date ──
  const formatted = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(data.issuedAt);
  const dateText = `Issued on ${formatted}`;
  const dateSize = 11;
  const dateWidth = helvetica.widthOfTextAtSize(dateText, dateSize);
  page.drawText(dateText, {
    x: (width - dateWidth) / 2,
    y: height - 320,
    size: dateSize,
    font: helvetica,
    color: softPurple,
  });

  // ── Signature lines ──
  const sigY = 100;
  const sigLineWidth = 160;

  // Left signature (instructor)
  const leftX = width / 2 - 200;
  page.drawLine({
    start: { x: leftX, y: sigY },
    end: { x: leftX + sigLineWidth, y: sigY },
    thickness: 1, color: accent, opacity: 0.6,
  });
  const instrWidth = helvetica.widthOfTextAtSize(data.instructorName, 10);
  page.drawText(data.instructorName, {
    x: leftX + (sigLineWidth - instrWidth) / 2,
    y: sigY - 16,
    size: 10, font: helvetica, color: lightPurple,
  });
  const instrLabel = "INSTRUCTOR";
  const instrLabelW = helvetica.widthOfTextAtSize(instrLabel, 9);
  page.drawText(instrLabel, {
    x: leftX + (sigLineWidth - instrLabelW) / 2,
    y: sigY - 30,
    size: 9, font: helvetica, color: lightPurple,
  });

  // Right signature (platform)
  const rightX = width / 2 + 40;
  page.drawLine({
    start: { x: rightX, y: sigY },
    end: { x: rightX + sigLineWidth, y: sigY },
    thickness: 1, color: accent, opacity: 0.6,
  });
  const platText = "LearnHub";
  const platW = helvetica.widthOfTextAtSize(platText, 10);
  page.drawText(platText, {
    x: rightX + (sigLineWidth - platW) / 2,
    y: sigY - 16,
    size: 10, font: helvetica, color: lightPurple,
  });
  const platLabel = "PLATFORM";
  const platLabelW = helvetica.widthOfTextAtSize(platLabel, 9);
  page.drawText(platLabel, {
    x: rightX + (sigLineWidth - platLabelW) / 2,
    y: sigY - 30,
    size: 9, font: helvetica, color: lightPurple,
  });

  // ── Certificate ID ──
  const certIdText = `Certificate ID: ${data.certificateId}`;
  const certIdSize = 9;
  const certIdWidth = helvetica.widthOfTextAtSize(certIdText, certIdSize);
  page.drawText(certIdText, {
    x: (width - certIdWidth) / 2,
    y: 50,
    size: certIdSize,
    font: helvetica,
    color: accent,
  });

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}
