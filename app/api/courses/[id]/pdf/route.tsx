import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

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

    if (line.startsWith("### ")) { blocks.push({ type: "h3", text: line.slice(4).trim() }); i++; continue; }
    if (line.startsWith("## "))  { blocks.push({ type: "h2", text: line.slice(3).trim() }); i++; continue; }
    if (line.startsWith("# "))   { blocks.push({ type: "h1", text: line.slice(2).trim() }); i++; continue; }

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

    if (line.trim() === "") { i++; continue; }

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
    if (paraLines.length > 0) blocks.push({ type: "paragraph", text: paraLines.join(" ") });
  }

  return blocks;
}

function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  if (!text) return [""];
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = words[0] ?? "";

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

  const pageWidth  = 595.28;
  const pageHeight = 841.89;
  const margin     = 52;
  const usableW    = pageWidth - margin * 2;

  // Design tokens
  const orange   = rgb(0.976, 0.451, 0.086);
  const white    = rgb(1, 1, 1);
  const darkBg   = rgb(0.05, 0.05, 0.07);
  const textDark = rgb(0.1, 0.1, 0.13);
  const textMid  = rgb(0.38, 0.38, 0.43);
  const textLight= rgb(0.6, 0.6, 0.65);
  const codeBg   = rgb(0.95, 0.95, 0.97);
  const codeText = rgb(0.1, 0.1, 0.45);
  const panelBg  = rgb(0.97, 0.97, 0.99);
  const divider  = rgb(0.87, 0.87, 0.90);

  const HEADER_H   = 36;
  const FOOTER_H   = 26;
  const contentTop = pageHeight - HEADER_H - 14;
  const contentBot = FOOTER_H + 14;

  const font        = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold    = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontMono    = await doc.embedFont(StandardFonts.Courier);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  // Embed site logo from /public/logo.png so the PDF matches the website branding
  let logoImage: Awaited<ReturnType<typeof doc.embedPng>> | null = null;
  try {
    const logoBytes = await readFile(path.join(process.cwd(), "public", "logo.png"));
    logoImage = await doc.embedPng(logoBytes);
  } catch {
    logoImage = null; // fall back to text branding if the file is missing
  }

  // Returns {width, height} for the logo scaled to a target height, preserving aspect ratio
  const logoSize = (targetHeight: number) => {
    if (!logoImage) return { width: 0, height: 0 };
    const ratio = logoImage.width / logoImage.height;
    return { width: targetHeight * ratio, height: targetHeight };
  };

  const instructorName = course.createdBy?.name || "Instructor";

  // ─── COVER PAGE ───────────────────────────────────────────────────────────
  const cover = doc.addPage([pageWidth, pageHeight]);

  // Full dark background
  cover.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: darkBg });

  // Orange left strip
  cover.drawRectangle({ x: 0, y: 0, width: 5, height: pageHeight, color: orange });

  // Orange top strip
  cover.drawRectangle({ x: 5, y: pageHeight - 5, width: pageWidth - 5, height: 5, color: orange });

  // Bottom-right corner accents (decorative)
  cover.drawRectangle({ x: pageWidth - 130, y: 32, width: 95, height: 3, color: orange, opacity: 0.3 });
  cover.drawRectangle({ x: pageWidth - 35,  y: 32, width: 3, height: 100, color: orange, opacity: 0.3 });

  // "COURSE MATERIAL" label
  cover.drawText("COURSE MATERIAL", {
    x: margin + 12, y: pageHeight - 70,
    size: 9, font: fontBold, color: orange,
  });

  // Thin rule
  cover.drawRectangle({ x: margin + 12, y: pageHeight - 84, width: usableW - 12, height: 0.5, color: white, opacity: 0.07 });

  // Course title
  let coverY = pageHeight - 150;
  const titleLines = wrapText(course.title, usableW - 12, fontBold, 28);
  for (const line of titleLines) {
    cover.drawText(line, { x: margin + 12, y: coverY, size: 28, font: fontBold, color: white });
    coverY -= 36;
  }

  // Orange accent bar
  cover.drawRectangle({ x: margin + 12, y: coverY, width: 72, height: 3, color: orange });
  coverY -= 26;

  // Description
  if (course.description) {
    const descLines = wrapText(course.description, usableW - 12, font, 11);
    for (const line of descLines.slice(0, 6)) {
      cover.drawText(line, { x: margin + 12, y: coverY, size: 11, font, color: rgb(0.64, 0.64, 0.70) });
      coverY -= 17;
    }
    coverY -= 6;
  }

  // Meta chips
  const metaParts: string[] = [`${course.lessons.length} Lessons`];
  if (course.level)    metaParts.push(course.level.charAt(0).toUpperCase() + course.level.slice(1) + " Level");
  if (course.language) metaParts.push(course.language);
  cover.drawText(metaParts.join("  ·  "), { x: margin + 12, y: coverY, size: 9.5, font, color: rgb(0.48, 0.48, 0.54) });

  // Bottom divider
  cover.drawRectangle({ x: margin + 12, y: 130, width: usableW - 12, height: 0.5, color: white, opacity: 0.07 });

  // Instructor info
  cover.drawText("INSTRUCTOR", { x: margin + 12, y: 114, size: 7.5, font: fontBold, color: rgb(0.42, 0.42, 0.48) });
  cover.drawText(instructorName, { x: margin + 12, y: 92, size: 15, font: fontBold, color: white });

  // Site logo (replaces former "LearnHub" wordmark)
  if (logoImage) {
    const { width: logoW, height: logoH } = logoSize(28);
    cover.drawImage(logoImage, {
      x: pageWidth - margin - logoW,
      y: 88,
      width: logoW,
      height: logoH,
      opacity: 0.95,
    });
  }
  const subW = font.widthOfTextAtSize("Learning Platform", 8.5);
  cover.drawText("Learning Platform", { x: pageWidth - margin - subW, y: 75, size: 8.5, font, color: rgb(0.38, 0.38, 0.44) });

  // Generated date
  const genDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  cover.drawText(`Generated ${genDate}`, { x: margin + 12, y: 50, size: 8, font, color: rgb(0.34, 0.34, 0.40) });

  // ─── CONTENT PAGES ────────────────────────────────────────────────────────
  const lessonPageIndices: number[] = [];

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = contentTop;

  const newPage = () => {
    page = doc.addPage([pageWidth, pageHeight]);
    y = contentTop;
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < contentBot) newPage();
  };

  const drawWrapped = (text: string, fnt: any, size: number, color: any, indent = 0) => {
    if (!text) return;
    const lineH = size + 5;
    for (const ln of wrapText(text, usableW - indent, fnt, size)) {
      if (y - size < contentBot) newPage();
      page.drawText(ln, { x: margin + indent, y, size, font: fnt, color });
      y -= lineH;
    }
  };

  // ── Lessons ──────────────────────────────────────────────────────────────
  for (let i = 0; i < course.lessons.length; i++) {
    const lesson = course.lessons[i];

    ensureSpace(80);
    lessonPageIndices.push(doc.getPageCount() - 1);

    y -= 12;

    // Check again after possible page break, update index
    if (lessonPageIndices[i] !== doc.getPageCount() - 1) {
      lessonPageIndices[i] = doc.getPageCount() - 1;
    }

    // Lesson section header
    const headerH = 38;
    ensureSpace(headerH + 16);
    if (lessonPageIndices[i] !== doc.getPageCount() - 1) {
      lessonPageIndices[i] = doc.getPageCount() - 1;
    }

    // Light accent background for lesson header
    page.drawRectangle({ x: margin, y: y - headerH + 4, width: usableW, height: headerH - 4, color: rgb(0.97, 0.97, 0.99) });
    page.drawRectangle({ x: margin, y: y - headerH + 4, width: 3, height: headerH - 4, color: orange });
    page.drawRectangle({ x: margin, y: y - headerH + 3, width: usableW, height: 0.5, color: divider });

    // Lesson number badge
    const numStr = String(i + 1).padStart(2, "0");
    page.drawText(numStr, { x: margin + 10, y: y - 11, size: 10, font: fontBold, color: orange });

    // Lesson title
    const ltLines = wrapText(lesson.title, usableW - 48, fontBold, 13);
    let ltY = y - 8;
    for (const ltLine of ltLines) {
      page.drawText(ltLine, { x: margin + 36, y: ltY, size: 13, font: fontBold, color: textDark });
      ltY -= 17;
    }

    y -= headerH;

    // Separator
    page.drawRectangle({ x: margin, y, width: usableW, height: 0.5, color: divider });
    y -= 14;

    if (!lesson.content) {
      page.drawText("No text content available for this lesson.", { x: margin, y, size: 10, font: fontOblique, color: textLight });
      y -= 20;
      continue;
    }

    const blocks = parseContent(lesson.content);

    for (const block of blocks) {
      switch (block.type) {
        case "h1":
          y -= 8; ensureSpace(24);
          drawWrapped(block.text, fontBold, 15, rgb(0.05, 0.05, 0.10));
          break;
        case "h2":
          y -= 6; ensureSpace(21);
          drawWrapped(block.text, fontBold, 13, textDark);
          break;
        case "h3":
          y -= 4; ensureSpace(18);
          drawWrapped(block.text, fontBold, 11, textMid);
          break;
        case "paragraph":
          y -= 3;
          drawWrapped(block.text, font, 10.5, textDark);
          break;
        case "code": {
          y -= 6;
          const codeLines = block.code.split("\n");
          const hasLabel  = block.lang && block.lang !== "code";
          const langH     = hasLabel ? 14 : 0;
          const blockH    = 8 + langH + codeLines.length * 12 + 8;

          const pageH = contentTop - contentBot;
          if (blockH <= pageH && y - blockH < contentBot) newPage();

          // Draw background only when block fits on one page
          if (y - blockH >= contentBot) {
            page.drawRectangle({ x: margin, y: y - blockH, width: usableW, height: blockH, color: codeBg });
            page.drawRectangle({ x: margin, y: y - blockH, width: 3,     height: blockH, color: orange, opacity: 0.65 });
          }

          y -= 8;

          if (hasLabel) {
            if (y < contentBot) newPage();
            page.drawText(block.lang.toUpperCase(), { x: margin + 10, y, size: 7.5, font: fontBold, color: orange });
            y -= 14;
          }

          for (const codeLine of codeLines) {
            if (y - 12 < contentBot) newPage();
            page.drawText(codeLine || " ", { x: margin + 10, y, size: 9.5, font: fontMono, color: codeText });
            y -= 12;
          }

          y -= 8;
          break;
        }
        case "list":
          y -= 3;
          for (const item of block.items) {
            ensureSpace(16);
            page.drawText("•", { x: margin + 10, y, size: 10, font, color: orange });
            drawWrapped(item, font, 10.5, textDark, 22);
          }
          break;
        case "numlist":
          y -= 3;
          block.items.forEach((item, idx) => {
            ensureSpace(16);
            page.drawText(`${idx + 1}.`, { x: margin + 8, y, size: 10.5, font: fontBold, color: orange });
            drawWrapped(item, font, 10.5, textDark, 22);
          });
          break;
      }
    }

    y -= 10;
  }

  // ─── TABLE OF CONTENTS (inserted at page index 1) ─────────────────────────
  // Content pages are currently: cover=0, content=1+
  // After inserting TOC at 1: cover=0, toc=1, content=2+
  // So lessonPageIndices[i] + 2 = 1-based page number for TOC display.

  const tocPage = doc.insertPage(1, [pageWidth, pageHeight]);

  // TOC header bar
  tocPage.drawRectangle({ x: 0, y: pageHeight - 62, width: pageWidth, height: 62, color: panelBg });
  tocPage.drawRectangle({ x: 0, y: pageHeight - 62, width: 3,         height: 62, color: orange });
  tocPage.drawRectangle({ x: 0, y: pageHeight - 62, width: pageWidth, height: 0.5, color: divider });
  tocPage.drawText("Table of Contents", { x: margin, y: pageHeight - 36, size: 19, font: fontBold, color: textDark });
  tocPage.drawText(course.title, { x: margin, y: pageHeight - 54, size: 9, font, color: textMid });
  if (logoImage) {
    const { width: tocLogoW, height: tocLogoH } = logoSize(18);
    tocPage.drawImage(logoImage, {
      x: pageWidth - margin - tocLogoW,
      y: pageHeight - 42,
      width: tocLogoW,
      height: tocLogoH,
    });
  }

  // TOC rows
  let tocY    = pageHeight - 84;
  const rowH  = 25;
  const tocBt = FOOTER_H + 18;

  course.lessons.forEach((lesson: any, i: number) => {
    if (tocY < tocBt) return;

    if (i % 2 === 0) {
      tocPage.drawRectangle({ x: margin - 8, y: tocY - 8, width: usableW + 16, height: rowH, color: rgb(0.975, 0.975, 0.985) });
    }

    // Lesson number
    tocPage.drawText(String(i + 1).padStart(2, "0"), { x: margin, y: tocY + 5, size: 9, font: fontBold, color: orange });

    // Lesson title
    const maxTitleW  = usableW - 60;
    const truncTitle = lesson.title.length > 68 ? lesson.title.slice(0, 65) + "…" : lesson.title;
    tocPage.drawText(truncTitle, { x: margin + 28, y: tocY + 5, size: 9.5, font, color: textDark });

    // Dot leaders
    const titleEndX = margin + 28 + font.widthOfTextAtSize(truncTitle, 9.5);
    const pgNumX    = pageWidth - margin - 26;
    let dotX = titleEndX + 6;
    while (dotX + 5 < pgNumX - 8) {
      tocPage.drawText(".", { x: dotX, y: tocY + 5, size: 9, font, color: rgb(0.76, 0.76, 0.80) });
      dotX += 5.5;
    }

    // Page number
    const pgNum  = String(lessonPageIndices[i] + 2);
    const pgNumW = fontBold.widthOfTextAtSize(pgNum, 9);
    tocPage.drawText(pgNum, { x: pageWidth - margin - pgNumW, y: tocY + 5, size: 9, font: fontBold, color: textDark });

    tocY -= rowH;
  });

  // ─── WATERMARK + HEADERS + FOOTERS (all pages) ────────────────────────────
  // Use the site logo as a faint diagonal watermark to match the website
  const wmTargetW = 320;
  const wmH = logoImage ? wmTargetW * (logoImage.height / logoImage.width) : 0;
  const wmAngle = 35;
  const wmRad   = (wmAngle * Math.PI) / 180;
  // Position the rotated logo so its visual centre lands at the page centre
  const wmX = pageWidth  / 2 - (wmTargetW / 2) * Math.cos(wmRad) + (wmH / 2) * Math.sin(wmRad);
  const wmY = pageHeight / 2 - (wmTargetW / 2) * Math.sin(wmRad) - (wmH / 2) * Math.cos(wmRad);

  const allPages = doc.getPages();
  const total    = allPages.length;

  allPages.forEach((p: any, idx: number) => {
    // Diagonal logo watermark (skips when the logo failed to load)
    if (logoImage) {
      p.drawImage(logoImage, {
        x: wmX, y: wmY,
        width:  wmTargetW,
        height: wmH,
        rotate: degrees(wmAngle),
        opacity: idx === 0 ? 0.05 : 0.06,
      });
    }

    if (idx === 0) return; // Cover has its own full design

    // ── Footer ──────────────────────────────────────────────────────────────
    p.drawRectangle({ x: 0, y: 0, width: pageWidth, height: FOOTER_H, color: panelBg });
    p.drawRectangle({ x: 0, y: FOOTER_H, width: pageWidth, height: 0.5, color: divider });
    p.drawRectangle({ x: 0, y: 0, width: 3, height: FOOTER_H, color: orange });
    const pgTxt = `Page ${idx + 1} of ${total}`;
    const pgW   = font.widthOfTextAtSize(pgTxt, 8);
    p.drawText(pgTxt, { x: (pageWidth - pgW) / 2, y: 8, size: 8, font, color: textLight });
    p.drawText(`© ${instructorName}`, { x: margin, y: 8, size: 7.5, font, color: textLight });

    // ── Header (content pages only; TOC at idx=1 has its own) ───────────────
    if (idx >= 2) {
      p.drawRectangle({ x: 0, y: pageHeight - HEADER_H, width: pageWidth, height: HEADER_H, color: panelBg });
      p.drawRectangle({ x: 0, y: pageHeight - HEADER_H, width: pageWidth, height: 0.5, color: divider });
      p.drawRectangle({ x: 0, y: pageHeight - HEADER_H, width: 3, height: HEADER_H, color: orange });
      const hTitle = course.title.length > 60 ? course.title.slice(0, 57) + "…" : course.title;
      p.drawText(hTitle, { x: margin, y: pageHeight - HEADER_H + 13, size: 9, font, color: textMid });
      if (logoImage) {
        const { width: hdrLogoW, height: hdrLogoH } = logoSize(14);
        p.drawImage(logoImage, {
          x: pageWidth - margin - hdrLogoW,
          y: pageHeight - HEADER_H + 11,
          width: hdrLogoW,
          height: hdrLogoH,
        });
      }
    }
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
        lessons:   { orderBy: { order: "asc" } },
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
