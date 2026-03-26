import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// Types corresponding to parsed markdown blocks
type Block =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "code"; lang: string; code: string }
  | { type: "list"; items: string[] }
  | { type: "numlist"; items: string[] }
  | { type: "paragraph"; text: string };

function parseContent(raw: string): Block[] {
  const lines = raw.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trimStart().startsWith("```")) {
      const lang = line.trim().replace(/^```/, "").trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      blocks.push({ type: "code", lang: lang || "code", code: codeLines.join("\n") });
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push({ type: "h3", text: line.slice(4).trim() });
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ type: "h2", text: line.slice(3).trim() });
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push({ type: "h1", text: line.slice(2).trim() });
      i++;
      continue;
    }

    if (/^[\s]*[•\-\*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[\s]*[•\-\*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[\s]*[•\-\*]\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    if (/^\d+[\.\)]\s/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[\.\)]\s/.test(lines[i].trim())) {
        items.push(lines[i].replace(/^\s*\d+[\.\)]\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "numlist", items });
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].trimStart().startsWith("```") &&
      !/^[\s]*[•\-\*]\s/.test(lines[i]) &&
      !/^\d+[\.\)]\s/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: "paragraph", text: paraLines.join(" ") });
    }
  }

  return blocks;
}

// Function to split text into array of strings that fit the maxWidth
function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = font.widthOfTextAtSize(currentLine + " " + word, fontSize);
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

async function generateCoursePDF(course: any) {
  const doc = await PDFDocument.create();
  
  // Page size A4 (595.28 x 841.89 points)
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;
  const usableWidth = pageWidth - margin * 2;

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await doc.embedFont(StandardFonts.Courier);

  // Helper to ensure we don't draw off the page
  const checkPageSpace = (needed: number) => {
    if (y - needed < margin) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };

  const drawWrappedText = (text: string, txtFont: any, size: number, color: any, indent: number = 0) => {
    if (!text) return;
    const lines = wrapText(text, usableWidth - indent, txtFont, size);
    for (const line of lines) {
      checkPageSpace(size + 5);
      page.drawText(line, { x: margin + indent, y, size, font: txtFont, color });
      y -= (size + 5);
    }
  };

  // --- Title Page ---
  y -= 40;
  drawWrappedText(course.title, fontBold, 24, rgb(0, 0, 0));
  y -= 20;

  if (course.description) {
    drawWrappedText(course.description, font, 12, rgb(0.2, 0.2, 0.2));
  }
  y -= 20;

  drawWrappedText(`Instructor: ${course.createdBy?.name || "Unknown"}`, font, 10, rgb(0.4, 0.4, 0.4));
  
  // Start on new page if cover page isn't enough, but it usually is. 
  y -= 40;

  // --- Lessons Content ---
  for (let i = 0; i < course.lessons.length; i++) {
    const lesson = course.lessons[i];
    // Start every lesson with some breathing room
    checkPageSpace(60); 
    y -= 20;

    // Lesson Title
    drawWrappedText(`Lesson ${i + 1}: ${lesson.title}`, fontBold, 18, rgb(0.1, 0.1, 0.4));
    y -= 10;

    if (!lesson.content && lesson.type !== "TEXT") {
      drawWrappedText("No text content available for this lesson.", font, 11, rgb(0.5, 0.5, 0.5));
      continue;
    }

    const blocks = parseContent(lesson.content || "");
    
    for (const block of blocks) {
      switch (block.type) {
        case "h1":
          y -= 10;
          drawWrappedText(block.text, fontBold, 16, rgb(0, 0, 0));
          break;
        case "h2":
          y -= 8;
          drawWrappedText(block.text, fontBold, 14, rgb(0.1, 0.1, 0.1));
          break;
        case "h3":
          y -= 6;
          drawWrappedText(block.text, fontBold, 12, rgb(0.2, 0.2, 0.2));
          break;
        case "paragraph":
          y -= 4;
          drawWrappedText(block.text, font, 11, rgb(0.15, 0.15, 0.15));
          break;
        case "code":
          y -= 4;
          const codeLines = block.code.split("\n");
          for (const line of codeLines) {
            checkPageSpace(12);
            page.drawText(line, { x: margin + 10, y, size: 10, font: fontMono, color: rgb(0.3, 0.3, 0.3) });
            y -= 12;
          }
          y -= 4;
          break;
        case "list":
          y -= 4;
          block.items.forEach((item) => {
            drawWrappedText(`• ${item}`, font, 11, rgb(0.15, 0.15, 0.15), 15);
          });
          break;
        case "numlist":
          y -= 4;
          block.items.forEach((item, idx) => {
            drawWrappedText(`${idx + 1}. ${item}`, font, 11, rgb(0.15, 0.15, 0.15), 15);
          });
          break;
      }
    }
  }

  // Footer / Page numbers 
  const pages = doc.getPages();
  pages.forEach((p, idx) => {
    const text = `Page ${idx + 1} of ${pages.length} - ${course.title}`;
    const textWidth = font.widthOfTextAtSize(text, 9);
    p.drawText(text, {
      x: (pageWidth - textWidth) / 2,
      y: 20,
      size: 9,
      font: font,
      color: rgb(0.5, 0.5, 0.5)
    });
  });

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: courseId } = await params;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        lessons: { orderBy: { order: "asc" } },
        createdBy: { select: { name: true } },
      },
    });

    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    const isPrivileged = session.role === "ADMIN" || session.role === "INSTRUCTOR";
    
    if (!isPrivileged) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: session.userId, courseId } },
      });
      if (!enrollment) return NextResponse.json({ error: "Forbidden: Not enrolled" }, { status: 403 });
    }

    const pdfBuffer = await generateCoursePDF(course);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="course-${course.slug || courseId}.pdf"`,
      },
    });
  } catch (err: unknown) {
    console.error("PDF Generation Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
