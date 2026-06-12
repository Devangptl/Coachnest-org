/**
 * Organization subscription invoice PDF (pdf-lib, A4 portrait).
 * Invoice numbers are derived, not stored: INV-{YYYYMM}-{txnId tail}.
 */
import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";

export interface OrgInvoiceData {
  invoiceNumber: string;
  issuedAt: Date;
  orgName: string;
  orgEmail: string | null;
  orgPhone: string | null;
  planName: string;
  billingCycle: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  razorpayPaymentId: string | null;
  refundAmount: number | null;
  periodEnd: Date | null;
}

export function orgInvoiceNumber(txnId: string, createdAt: Date): string {
  const ym = `${createdAt.getFullYear()}${String(createdAt.getMonth() + 1).padStart(2, "0")}`;
  return `INV-${ym}-${txnId.slice(-6).toUpperCase()}`;
}

const INK = rgb(0.13, 0.13, 0.13);
const MUTED = rgb(0.45, 0.45, 0.45);
const ACCENT = rgb(0.976, 0.451, 0.086); // #f97316
const LINE = rgb(0.88, 0.88, 0.88);

export async function generateOrgInvoicePDF(data: OrgInvoiceData): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4 pt
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const M = 56;
  let y = 842 - M;

  const text = (
    s: string,
    x: number,
    yy: number,
    size = 10,
    f: PDFFont = font,
    color = INK,
  ) => page.drawText(s, { x, y: yy, size, font: f, color });

  const rightText = (s: string, yy: number, size = 10, f: PDFFont = font, color = INK) => {
    const w = f.widthOfTextAtSize(s, size);
    page.drawText(s, { x: 595 - M - w, y: yy, size, font: f, color });
  };

  const hr = (yy: number) =>
    page.drawLine({ start: { x: M, y: yy }, end: { x: 595 - M, y: yy }, thickness: 0.7, color: LINE });

  // Header
  text("Coachnest", M, y, 22, bold, ACCENT);
  rightText("TAX INVOICE", y, 14, bold, MUTED);
  y -= 18;
  text("Online Learning Platform", M, y, 9, font, MUTED);
  y -= 28;
  hr(y);
  y -= 24;

  // Invoice meta + billed-to
  text("Billed to", M, y, 9, bold, MUTED);
  rightText(`Invoice  ${data.invoiceNumber}`, y, 10, bold);
  y -= 15;
  text(data.orgName, M, y, 12, bold);
  rightText(
    `Date  ${data.issuedAt.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}`,
    y,
    10,
  );
  y -= 14;
  if (data.orgEmail) {
    text(data.orgEmail, M, y, 9, font, MUTED);
    y -= 12;
  }
  if (data.orgPhone) {
    text(data.orgPhone, M, y, 9, font, MUTED);
    y -= 12;
  }
  y -= 18;

  // Line-items table
  hr(y);
  y -= 16;
  text("DESCRIPTION", M, y, 8, bold, MUTED);
  rightText("AMOUNT", y, 8, bold, MUTED);
  y -= 14;
  hr(y);
  y -= 18;

  const cycleLabel = data.billingCycle === "YEARLY" ? "Yearly" : "Monthly";
  const desc = `${data.planName} plan — ${cycleLabel} ${data.type.toLowerCase()}`;
  text(desc, M, y, 11);
  rightText(`${data.currency === "INR" ? "Rs. " : data.currency + " "}${data.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, y, 11, bold);
  y -= 14;
  if (data.periodEnd) {
    text(
      `Service period through ${data.periodEnd.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}`,
      M,
      y,
      9,
      font,
      MUTED,
    );
    y -= 14;
  }
  if (data.refundAmount) {
    text("Refund issued", M, y, 10, font, MUTED);
    rightText(
      `- ${data.currency === "INR" ? "Rs. " : data.currency + " "}${data.refundAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      y,
      10,
      font,
      MUTED,
    );
    y -= 14;
  }
  y -= 6;
  hr(y);
  y -= 20;

  const net = data.amount - (data.refundAmount ?? 0);
  text("Total", M, y, 12, bold);
  rightText(
    `${data.currency === "INR" ? "Rs. " : data.currency + " "}${net.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    y,
    13,
    bold,
    ACCENT,
  );
  y -= 30;

  text(`Payment status: ${data.status}`, M, y, 9, font, MUTED);
  y -= 12;
  if (data.razorpayPaymentId) {
    text(`Payment reference: ${data.razorpayPaymentId}`, M, y, 9, font, MUTED);
    y -= 12;
  }

  // Footer
  page.drawLine({ start: { x: M, y: 80 }, end: { x: 595 - M, y: 80 }, thickness: 0.7, color: LINE });
  text("This is a computer-generated invoice and does not require a signature.", M, 64, 8, font, MUTED);

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
