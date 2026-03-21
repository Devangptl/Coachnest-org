/**
 * GET /api/certificates/[courseId]
 * Issues a certificate (if not already) and streams the PDF.
 * Authenticated students who have completed the course.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { issueCertificate } from "@/services/certificate.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { courseId } = await params;
    const result = await issueCertificate(session.userId, courseId);

    if ("pdfBuffer" in result && result.pdfBuffer) {
      const uint8 = new Uint8Array(result.pdfBuffer);
      return new NextResponse(uint8, {
        headers: {
          "Content-Type":        "application/pdf",
          "Content-Disposition": `attachment; filename="certificate-${courseId}.pdf"`,
        },
      });
    }

    // Already issued, no buffer — redirect to cert URL or return info
    return NextResponse.json({ certificate: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status  = message === "Course not yet completed" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
