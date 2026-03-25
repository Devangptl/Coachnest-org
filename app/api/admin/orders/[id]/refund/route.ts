/**
 * POST /api/admin/orders/[id]/refund — Process refund for an order
 */
import { getSession } from "@/lib/auth";
import { updateOrderStatus } from "@/services/order.service";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { amount, reason } = body;

    if (!amount) {
      return NextResponse.json({ error: "Refund amount is required." }, { status: 400 });
    }

    const order = await updateOrderStatus(id, "REFUNDED");

    return NextResponse.json(
      { message: "Refund processed successfully.", data: order },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/admin/orders/[id]/refund]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
