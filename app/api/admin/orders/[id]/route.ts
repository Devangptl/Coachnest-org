/**
 * GET /api/admin/orders/[id] — Get order details
 */
import { getSession } from "@/lib/auth";
import { getOrderDetails } from "@/services/order.service";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    const order = await getOrderDetails(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    return NextResponse.json({ data: order }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/admin/orders/[id]]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
