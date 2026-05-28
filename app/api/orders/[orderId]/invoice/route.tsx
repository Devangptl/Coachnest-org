/**
 * GET /api/orders/[orderId]/invoice
 *
 * Generates and streams a PDF invoice for a PAID order.
 * Only accessible by the order owner.
 */
import { type NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import InvoiceDocument, { type InvoiceData } from "@/components/pdf/InvoiceDocument";

// Force Node.js runtime — @react-pdf/renderer is not compatible with Edge
export const runtime = "nodejs";

type Params = { params: Promise<{ orderId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user:    { select: { name: true, email: true } },
        course:  { select: { title: true } },
        feature: { select: { name: true } },
        coupon:  { select: { code: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Authorisation: must be the owner
    if (order.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only generate invoices for paid orders
    if (order.status !== "PAID") {
      return NextResponse.json(
        { error: "Invoice is only available for paid orders" },
        { status: 400 }
      );
    }

    const paid          = Number(order.amount);
    const discount      = Number(order.discountAmount ?? 0);
    const originalPrice = paid + discount;

    const invoice: InvoiceData = {
      orderId:         order.id,
      customerName:    order.user.name,
      customerEmail:   order.user.email,
      itemTitle:       order.course?.title ?? order.feature?.name ?? "Purchase",
      itemType:        order.featureId ? "feature" : "course",
      amount:          paid,
      discountAmount:  discount,
      originalAmount:  originalPrice,
      currency:        order.currency,
      couponCode:      order.coupon?.code ?? null,
      razorpayPaymentId: order.razorpayPaymentId,
      createdAt:       order.createdAt,
    };

    const element = <InvoiceDocument invoice={invoice} /> as React.ReactElement<DocumentProps>;
    const buffer  = await renderToBuffer(element);

    const filename = `invoice-${order.id.slice(-8).toUpperCase()}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length":      buffer.byteLength.toString(),
        // Prevent caching so a re-generated invoice is always fresh
        "Cache-Control":       "no-store",
      },
    });
  } catch (error) {
    console.error("[GET /api/orders/[orderId]/invoice]", error);
    return NextResponse.json({ error: "Failed to generate invoice" }, { status: 500 });
  }
}
