/**
 * InvoiceDocument — @react-pdf/renderer component for purchase invoices.
 *
 * Layout: A4, brand-orange accent bar at top, two-column header,
 * bill-to / invoice-meta info row, itemised table, full totals breakdown
 * (including processing fee), payment reference, and fixed footer.
 */
import path from "path";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

const LOGO_PATH = path.join(process.cwd(), "public", "logo.png");

const BRAND   = "#d97757";
const INK     = "#111827";
const MUTED   = "#6b7280";
const FAINT   = "#9ca3af";
const BORDER  = "#e5e7eb";
const SURFACE = "#f9fafb";
const GREEN   = "#15803d";
const GREENBG = "#dcfce7";

// ─── Styles ──────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    paddingTop:       64,
    paddingBottom:    60,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    fontSize:   10,
    color:      INK,
  },

  // ── Brand accent bar (absolutely positioned, bleeds to page edge) ──────────
  accentBar: {
    position:        "absolute",
    top:             0,
    left:            0,
    right:           0,
    height:          6,
    backgroundColor: BRAND,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection:   "row",
    justifyContent:  "space-between",
    alignItems:      "flex-start",
    marginBottom:    24,
  },
  headerLeft: { flexDirection: "column", gap: 4 },
  logo:       { width: 110, height: "auto", objectFit: "contain", marginBottom: 6 },
  companyName:  { fontSize: 9, color: MUTED },
  companyEmail: { fontSize: 9, color: MUTED },

  headerRight:    { flexDirection: "column", alignItems: "flex-end", gap: 3 },
  invoiceTitle:   { fontSize: 26, fontFamily: "Helvetica-Bold", color: INK, letterSpacing: 2 },
  invoiceNumber:  { fontSize: 9,  fontFamily: "Courier", color: MUTED, marginTop: 2 },
  invoiceDate:    { fontSize: 9,  color: MUTED, marginTop: 1 },

  // ── Divider ───────────────────────────────────────────────────────────────
  hr:     { height: 1, backgroundColor: BORDER, marginVertical: 18 },
  hrThin: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 6 },

  // ── Bill To / Status row ──────────────────────────────────────────────────
  metaRow: {
    flexDirection:  "row",
    justifyContent: "space-between",
    marginBottom:   20,
  },
  metaBlock: { flexDirection: "column" },

  sectionLabel: {
    fontSize:      7.5,
    fontFamily:    "Helvetica-Bold",
    color:         FAINT,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom:  5,
  },
  metaName:  { fontSize: 11, fontFamily: "Helvetica-Bold", color: INK },
  metaEmail: { fontSize: 9,  color: MUTED, marginTop: 3 },

  // Status badge
  paidBadge: {
    backgroundColor: GREENBG,
    paddingHorizontal: 10,
    paddingVertical:    4,
    borderRadius:       4,
    alignSelf:         "flex-start",
    marginTop:          5,
  },
  paidText: {
    fontSize:   8.5,
    fontFamily: "Helvetica-Bold",
    color:      GREEN,
    letterSpacing: 1,
  },

  // ── Items table ───────────────────────────────────────────────────────────
  tableWrap: {
    borderWidth:  1,
    borderColor:  BORDER,
    borderRadius: 4,
    overflow:     "hidden",
    marginBottom: 4,
  },
  tableHeader: {
    flexDirection:   "row",
    backgroundColor: SURFACE,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableRow: {
    flexDirection:   "row",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  thText: {
    fontSize:      7.5,
    fontFamily:    "Helvetica-Bold",
    color:         MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tdText: { fontSize: 10, color: INK },
  tdSub:  { fontSize: 8.5, color: FAINT, marginTop: 3 },
  colDesc: { flex: 1 },
  colQty:  { width: 40,  textAlign: "center" },
  colUnit: { width: 90,  textAlign: "right" },
  colAmt:  { width: 90,  textAlign: "right" },

  // ── Totals ────────────────────────────────────────────────────────────────
  totalsWrap: { marginTop: 10, alignItems: "flex-end" },
  totalsInner: {
    width:       270,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    overflow:    "hidden",
  },
  totalsRow: {
    flexDirection:   "row",
    justifyContent:  "space-between",
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  totalsRowAlt: {
    flexDirection:   "row",
    justifyContent:  "space-between",
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: SURFACE,
  },
  totalsKey: { fontSize: 9.5, color: MUTED },
  totalsVal: { fontSize: 9.5, color: INK,  fontFamily: "Helvetica-Bold" },
  totalsKeyDiscount: { fontSize: 9.5, color: GREEN },
  totalsValDiscount: { fontSize: 9.5, color: GREEN, fontFamily: "Helvetica-Bold" },

  totalsFinalRow: {
    flexDirection:   "row",
    justifyContent:  "space-between",
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#fff7ed",
    borderTopWidth:  1,
    borderTopColor:  BORDER,
  },
  totalsFinalKey: { fontSize: 11, fontFamily: "Helvetica-Bold", color: INK },
  totalsFinalVal: { fontSize: 11, fontFamily: "Helvetica-Bold", color: BRAND },

  // ── Payment reference ─────────────────────────────────────────────────────
  refWrap:  { marginTop: 20 },
  refValue: {
    fontFamily: "Courier",
    fontSize:   8.5,
    color:      MUTED,
    backgroundColor: SURFACE,
    paddingHorizontal: 8,
    paddingVertical:   5,
    borderRadius: 3,
    marginTop: 4,
    borderWidth: 1,
    borderColor: BORDER,
  },

  // ── Thank-you ─────────────────────────────────────────────────────────────
  thankYou: {
    marginTop:  28,
    textAlign:  "center",
    fontSize:   11,
    fontFamily: "Helvetica-Bold",
    color:      BRAND,
  },
  thankYouSub: {
    textAlign: "center",
    fontSize:  8.5,
    color:     FAINT,
    marginTop: 4,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom:   30,
    left:     48,
    right:    48,
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop:     10,
  },
  footerText:      { fontSize: 7.5, color: FAINT },
  footerTextRight: { fontSize: 7.5, color: FAINT, textAlign: "right" },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `INR ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-IN", {
    year: "numeric", month: "long", day: "numeric",
  });
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InvoiceData {
  orderId:           string;
  customerName:      string;
  customerEmail:     string;
  itemTitle:         string;
  itemType:          "course" | "feature";
  amount:            number;   // final total paid (incl. processingFee)
  discountAmount:    number;
  processingFee:     number;
  originalAmount:    number;   // goods price before discount (amount - processingFee + discountAmount)
  currency:          string;
  couponCode:        string | null;
  razorpayPaymentId: string | null;
  createdAt:         Date | string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function InvoiceDocument({ invoice }: { invoice: InvoiceData }) {
  const invoiceNo   = `INV-${invoice.orderId.slice(-10).toUpperCase()}`;
  const generatedOn = fmtDate(new Date());
  const hasDiscount = invoice.discountAmount > 0;
  const hasFee      = invoice.processingFee > 0;
  const hasAdjustments = hasDiscount || hasFee;

  return (
    <Document title={`Invoice ${invoiceNo} – Coachnest`} author="Coachnest">
      <Page size="A4" style={S.page}>

        {/* ── Brand accent bar ────────────────────────────────────── */}
        <View style={S.accentBar} fixed />

        {/* ── Header ─────────────────────────────────────────────── */}
        <View style={S.header}>
          <View style={S.headerLeft}>
            <Image src={LOGO_PATH} style={S.logo} />
            <Text style={S.companyEmail}>support@coachnest.com · www.coachnest.in</Text>
          </View>
          <View style={S.headerRight}>
            <Text style={S.invoiceTitle}>INVOICE</Text>
            <Text style={S.invoiceNumber}>{invoiceNo}</Text>
            <Text style={S.invoiceDate}>Date: {fmtDate(invoice.createdAt)}</Text>
          </View>
        </View>

        <View style={S.hr} />

        {/* ── Bill To + Status ────────────────────────────────────── */}
        <View style={S.metaRow}>
          <View style={S.metaBlock}>
            <Text style={S.sectionLabel}>Billed To</Text>
            <Text style={S.metaName}>{invoice.customerName}</Text>
            <Text style={S.metaEmail}>{invoice.customerEmail}</Text>
          </View>
          <View style={[S.metaBlock, { alignItems: "flex-end" }]}>
            <Text style={S.sectionLabel}>Payment Status</Text>
            <View style={S.paidBadge}>
              <Text style={S.paidText}>PAID</Text>
            </View>
          </View>
        </View>

        <View style={S.hr} />

        {/* ── Items table ────────────────────────────────────────── */}
        <View style={S.tableWrap}>
          <View style={S.tableHeader}>
            <Text style={[S.thText, S.colDesc]}>Description</Text>
            <Text style={[S.thText, S.colQty]}>Qty</Text>
            <Text style={[S.thText, S.colUnit]}>Unit Price</Text>
            <Text style={[S.thText, S.colAmt]}>Amount</Text>
          </View>

          <View style={S.tableRow}>
            <View style={S.colDesc}>
              <Text style={S.tdText}>{invoice.itemTitle}</Text>
              <Text style={S.tdSub}>
                {invoice.itemType === "course" ? "Online Course" : "Platform Add-on"} · Lifetime Access
              </Text>
            </View>
            <Text style={[S.tdText, S.colQty]}>1</Text>
            <Text style={[S.tdText, S.colUnit]}>{fmt(invoice.originalAmount)}</Text>
            <Text style={[S.tdText, S.colAmt]}>{fmt(invoice.originalAmount)}</Text>
          </View>
        </View>

        {/* ── Totals ─────────────────────────────────────────────── */}
        <View style={S.totalsWrap}>
          <View style={S.totalsInner}>
            {!hasAdjustments ? (
              /* No adjustments — just show the total */
              <View style={S.totalsFinalRow}>
                <Text style={S.totalsFinalKey}>Total Paid</Text>
                <Text style={S.totalsFinalVal}>{fmt(invoice.amount)}</Text>
              </View>
            ) : (
              <>
                <View style={S.totalsRow}>
                  <Text style={S.totalsKey}>Subtotal</Text>
                  <Text style={S.totalsVal}>{fmt(invoice.originalAmount)}</Text>
                </View>

                {hasDiscount && (
                  <View style={S.totalsRowAlt}>
                    <Text style={S.totalsKeyDiscount}>
                      Discount{invoice.couponCode ? ` (${invoice.couponCode})` : ""}
                    </Text>
                    <Text style={S.totalsValDiscount}>-{fmt(invoice.discountAmount)}</Text>
                  </View>
                )}

                {hasFee && (
                  <View style={S.totalsRow}>
                    <Text style={S.totalsKey}>Processing Fee (2%)</Text>
                    <Text style={S.totalsVal}>{fmt(invoice.processingFee)}</Text>
                  </View>
                )}

                <View style={S.totalsFinalRow}>
                  <Text style={S.totalsFinalKey}>Total Paid</Text>
                  <Text style={S.totalsFinalVal}>{fmt(invoice.amount)}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* ── Payment reference ──────────────────────────────────── */}
        {invoice.razorpayPaymentId && (
          <View style={S.refWrap}>
            <Text style={S.sectionLabel}>Payment Reference</Text>
            <Text style={S.refValue}>{invoice.razorpayPaymentId}</Text>
          </View>
        )}

        {/* ── Thank-you ──────────────────────────────────────────── */}
        <Text style={S.thankYou}>Thank you for your purchase!</Text>
        <Text style={S.thankYouSub}>
          This is a computer-generated invoice and does not require a signature.
        </Text>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>Coachnest · support@coachnest.com</Text>
          <Text style={S.footerTextRight}>Generated on {generatedOn}</Text>
        </View>

      </Page>
    </Document>
  );
}
