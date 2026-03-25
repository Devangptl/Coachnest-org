/**
 * GET /api/certificates/[courseId]
 * Issues a certificate (if not already) and streams the PDF.
 * Always returns a PDF — works for both first-issue and re-download.
 *
 * Query params:
 *   ?userId=xxx — Admin/Instructor can generate certs for any student.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { issueCertificate } from "@/services/certificate.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { courseId } = await params;

    // Admin/Instructor can specify a userId to download any student's certificate
    let targetUserId = session.userId;
    const queryUserId = req.nextUrl.searchParams.get("userId");
    if (queryUserId) {
      if (session.role !== "ADMIN" && session.role !== "INSTRUCTOR") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      targetUserId = queryUserId;
    }

    const { pdfBuffer } = await issueCertificate(targetUserId, courseId);

    const uint8 = new Uint8Array(pdfBuffer);
    return new NextResponse(uint8, {
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="certificate-${courseId}.pdf"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status  = message === "Course not yet completed" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
