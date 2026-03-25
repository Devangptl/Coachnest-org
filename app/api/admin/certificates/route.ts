/**
 * GET /api/admin/certificates — list all issued certificates (admin only).
 * Query params: ?search=... for filtering by student name/email or course title.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllCertificates } from "@/services/certificate.service";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "INSTRUCTOR")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const search = req.nextUrl.searchParams.get("search") || undefined;
    const certificates = await getAllCertificates(search);

    return NextResponse.json({ certificates });
  } catch (error) {
    console.error("[GET /api/admin/certificates]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
