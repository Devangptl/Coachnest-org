/**
 * GET /api/org/[slug]/billing/invoices/[txnId] — invoice PDF download.
 * ORG_ADMIN; works while expired. Ownership enforced by the compound
 * { id, organizationId } lookup.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgPermission, orgAuthErrorResponse } from "@/lib/org-auth";
import { generateOrgInvoicePDF, orgInvoiceNumber } from "@/lib/org-invoice-pdf";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; txnId: string }> },
) {
  try {
    const { slug, txnId } = await params;
    const ctx = await requireOrgPermission(slug, "billing:view", { allowExpired: true });

    const txn = await prisma.organizationTransaction.findFirst({
      where: { id: txnId, organizationId: ctx.org.id },
      include: {
        subscription: { include: { plan: { select: { name: true } } } },
        organization: { select: { name: true, email: true, phone: true } },
      },
    });
    if (!txn || txn.status === "PENDING" || txn.status === "FAILED") {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const notes = (txn.notes ?? {}) as { planName?: string };
    const pdf = await generateOrgInvoicePDF({
      invoiceNumber: orgInvoiceNumber(txn.id, txn.createdAt),
      issuedAt: txn.createdAt,
      orgName: txn.organization.name,
      orgEmail: txn.organization.email,
      orgPhone: txn.organization.phone,
      planName: notes.planName ?? txn.subscription?.plan.name ?? "Subscription",
      billingCycle: txn.subscription?.billingCycle ?? "MONTHLY",
      type: txn.type,
      amount: Number(txn.amount),
      currency: txn.currency,
      status: txn.status,
      razorpayPaymentId: txn.razorpayPaymentId,
      refundAmount: txn.refundAmount ? Number(txn.refundAmount) : null,
      periodEnd: txn.subscription?.endDate ?? null,
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${orgInvoiceNumber(txn.id, txn.createdAt)}.pdf"`,
      },
    });
  } catch (error) {
    const res = orgAuthErrorResponse(error);
    if (res) return res;
    console.error("[GET /api/org/[slug]/billing/invoices/[txnId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
