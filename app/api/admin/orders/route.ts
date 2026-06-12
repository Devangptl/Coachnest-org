/**
 * GET /api/admin/orders — List all orders with filters
 */
import { getSession } from "@/lib/auth";
import { getOrdersList } from "@/services/order.service";
import { NextResponse } from "next/server";
import { OrderStatus } from "@/lib/generated/prisma/client";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const url = new URL(req.url);
    const status = (url.searchParams.get("status") as OrderStatus) || undefined;
    const dateFrom = url.searchParams.get("dateFrom") || undefined;
    const dateTo = url.searchParams.get("dateTo") || undefined;
    const minAmount = url.searchParams.get("minAmount") ? Number(url.searchParams.get("minAmount")) : undefined;
    const maxAmount = url.searchParams.get("maxAmount") ? Number(url.searchParams.get("maxAmount")) : undefined;
    const courseId = url.searchParams.get("courseId") || undefined;
    const search = url.searchParams.get("search") || undefined;
    const page = Number(url.searchParams.get("page")) || undefined;
    const pageSize = Number(url.searchParams.get("pageSize")) || undefined;

    const result = await getOrdersList({
      status,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      courseId,
      search,
      page,
      pageSize,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[GET /api/admin/orders]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
