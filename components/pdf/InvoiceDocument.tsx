/**
 * InvoiceDocument — @react-pdf/renderer component for purchase invoices.
 * Renders an A4 PDF with brand header, itemisation, discount, totals,
 * and payment reference. Uses built-in PDF fonts (no external fetch).
 */
import path from "path";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

const LOGO_PATH = path.join(process.cwd(), "public", "logo.png");

// ─── Styles ──────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    paddingTop: 52,
    paddingBottom: 52,
    paddingHorizontal: 52,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: "#111827",
  },

  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { width: 120, height: "auto", objectFit: "contain" },
  invoiceLabel: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#111827", textAlign: "right" },
  invoiceNo: { fontSize: 9, color: "#6b7280", textAlign: "right", marginTop: 3, fontFamily: "Courier" },

  // Divider
  hr: { height: 1, backgroundColor: "#e5e7eb", marginVertical: 20 },
  hrThin: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 8 },

  // Two-column info row
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  infoBlock: { flexDirection: "column" },
  infoRight: { flexDirection: "column", alignItems: "flex-end" },
  label: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  value: { fontSize: 11, color: "#111827" },
  valueSub: { fontSize: 10, color: "#6b7280", marginTop: 2 },

  // Status badge
  paidBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    alignSelf: "flex-end",
  },
  paidText: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#15803d" },

  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  thText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tdText: { fontSize: 11, color: "#111827" },
  tdSub: { fontSize: 9, color: "#9ca3af", marginTop: 3 },
  colItem: { flex: 1 },
  colQty: { width: 48, textAlign: "center" },
  colAmt: { width: 88, textAlign: "right" },

  // Totals
  totalsWrap: { marginTop: 8, alignItems: "flex-end" },
  totalsRow: { flexDirection: "row", marginBottom: 5 },
  totalsKey: { width: 130, textAlign: "right", paddingRight: 16, color: "#6b7280", fontSize: 11 },
  totalsVal: { width: 88, textAlign: "right", fontSize: 11 },
  totalsFinalKey: {
    width: 130,
    textAlign: "right",
    paddingRight: 16,
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
  },
  totalsFinalVal: {
    width: 88,
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    color: "#ea580c",
  },

  // Payment ref
  refWrap: { marginTop: 4 },
  refValue: { fontFamily: "Courier", fontSize: 9, color: "#374151" },

  // Thank-you
  thankYou: {
    marginTop: 36,
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#ea580c",
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 36,
    left: 52,
    right: 52,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 12,
  },
  footerText: { fontSize: 8, color: "#9ca3af" },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function currency(n: number) {
  // Use "INR " prefix — built-in PDF fonts don't carry the ₹ glyph
  return `INR ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InvoiceData {
  orderId:         string;
  customerName:    string;
  customerEmail:   string;
  itemTitle:       string;
  itemType:        "course" | "feature";
  amount:          number; // final amount paid
  discountAmount:  number;
  originalAmount:  number; // amount + discountAmount
  currency:        string;
  couponCode:      string | null;
  stripePaymentId: string | null;
  createdAt:       Date | string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function InvoiceDocument({ invoice }: { invoice: InvoiceData }) {
  const invoiceNo = `INV-${invoice.orderId.slice(-10).toUpperCase()}`;
  const generatedOn = fmtDate(new Date());

  return (
    <Document title={`Invoice ${invoiceNo} – Coachnest`} author="Coachnest">
      <Page size="A4" style={S.page}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <View style={S.header}>
          <Image src={LOGO_PATH} style={S.logo} />
          <View>
            <Text style={S.invoiceLabel}>INVOICE</Text>
            <Text style={S.invoiceNo}>{invoiceNo}</Text>
          </View>
        </View>

        <View style={S.hr} />

        {/* ── Billing info + Invoice details ─────────────────────── */}
        <View style={S.infoRow}>
          <View style={S.infoBlock}>
            <Text style={S.label}>Billed To</Text>
            <Text style={S.value}>{invoice.customerName}</Text>
            <Text style={S.valueSub}>{invoice.customerEmail}</Text>
          </View>

          <View style={S.infoRight}>
            <View style={{ marginBottom: 10, alignItems: "flex-end" }}>
              <Text style={S.label}>Invoice Date</Text>
              <Text style={S.value}>{fmtDate(invoice.createdAt)}</Text>
            </View>
            <View style={{ marginBottom: 10, alignItems: "flex-end" }}>
              <Text style={S.label}>Status</Text>
              <View style={S.paidBadge}>
                <Text style={S.paidText}>PAID</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={S.hr} />

        {/* ── Items table ────────────────────────────────────────── */}
        <View style={S.tableHeader}>
          <Text style={[S.thText, S.colItem]}>Description</Text>
          <Text style={[S.thText, S.colQty]}>Qty</Text>
          <Text style={[S.thText, S.colAmt]}>Amount</Text>
        </View>

        <View style={S.tableRow}>
          <View style={S.colItem}>
            <Text style={S.tdText}>{invoice.itemTitle}</Text>
            <Text style={S.tdSub}>
              {invoice.itemType === "course" ? "Online Course" : "Platform Add-on"} · Lifetime Access
            </Text>
          </View>
          <Text style={[S.tdText, S.colQty]}>1</Text>
          <Text style={[S.tdText, S.colAmt]}>
            {currency(invoice.discountAmount > 0 ? invoice.originalAmount : invoice.amount)}
          </Text>
        </View>

        <View style={S.hrThin} />

        {/* ── Totals ─────────────────────────────────────────────── */}
        <View style={S.totalsWrap}>
          {invoice.discountAmount > 0 && (
            <>
              <View style={S.totalsRow}>
                <Text style={S.totalsKey}>Subtotal</Text>
                <Text style={S.totalsVal}>{currency(invoice.originalAmount)}</Text>
              </View>
              <View style={S.totalsRow}>
                <Text style={[S.totalsKey, { color: "#15803d" }]}>
                  Discount{invoice.couponCode ? ` (${invoice.couponCode})` : ""}
                </Text>
                <Text style={[S.totalsVal, { color: "#15803d" }]}>
                  -{currency(invoice.discountAmount)}
                </Text>
              </View>
              <View style={S.hrThin} />
            </>
          )}

          <View style={[S.totalsRow, { marginTop: 4 }]}>
            <Text style={S.totalsFinalKey}>Total Paid</Text>
            <Text style={S.totalsFinalVal}>{currency(invoice.amount)}</Text>
          </View>
        </View>

        <View style={S.hr} />

        {/* ── Payment reference ──────────────────────────────────── */}
        {invoice.stripePaymentId && (
          <View style={S.refWrap}>
            <Text style={S.label}>Payment Reference</Text>
            <Text style={S.refValue}>{invoice.stripePaymentId}</Text>
          </View>
        )}

        {/* ── Thank-you ──────────────────────────────────────────── */}
        <Text style={S.thankYou}>Thank you for your purchase!</Text>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>Coachnest · support@coachnest.com</Text>
          <Text style={S.footerText}>Generated on {generatedOn}</Text>
        </View>

      </Page>
    </Document>
  );
}
