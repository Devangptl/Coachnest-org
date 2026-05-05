/**
 * POST /api/instructor/lessons/extract-pdf
 *
 * Accepts a multipart/form-data PDF (field "file") and returns its
 * selectable text content. Used by the lesson editor's "Import from PDF"
 * action to auto-populate lesson content from a source PDF.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const { pathToFileURL } = await import("url");
  const { getPath }       = await import("pdf-parse/worker");
  const pdfjs             = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(getPath()).href;

  const { PDFParse } = await import("pdf-parse");
  const result       = await new PDFParse({ data: buffer }).getText();
  return result.text;
}

function normalize(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "INSTRUCTOR" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: "Invalid form data." }, { status: 400 }); }

  const file = formData.get("file");
  if (!file || typeof file === "string")
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (file.type !== "application/pdf")
    return NextResponse.json({ error: "Only PDF files are accepted." }, { status: 400 });
  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: "File too large (max 10 MB)." }, { status: 400 });

  let rawText: string;
  try {
    rawText = await extractTextFromPdf(Buffer.from(await file.arrayBuffer()));
  } catch (err) {
    console.error("[extract-pdf] pdf-parse error:", err);
    return NextResponse.json(
      { error: "Could not read the PDF. Make sure it contains selectable text (not a scanned image)." },
      { status: 422 },
    );
  }

  const content = normalize(rawText);
  if (!content) {
    return NextResponse.json(
      { error: "PDF contains no extractable text." },
      { status: 422 },
    );
  }

  return NextResponse.json({
    content,
    title: (file.name || "").replace(/\.pdf$/i, "").trim() || null,
    chars: content.length,
  });
}
