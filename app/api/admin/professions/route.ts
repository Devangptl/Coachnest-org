/**
 * GET  /api/admin/professions — list all professions (admin, includes inactive)
 * POST /api/admin/professions — create new profession
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import slugify from "slugify";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const professions = await prisma.profession.findMany({
      orderBy: { order: "asc" },
      include: {
        _count: { select: { users: true } },
      },
    });

    return NextResponse.json({ professions });
  } catch (error) {
    console.error("[GET /api/admin/professions]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const { name, description, icon, color, courseKeywords, order } = await req.json();

    if (!name || !description || !icon) {
      return NextResponse.json(
        { error: "Name, description, and icon are required." },
        { status: 400 }
      );
    }

    let slug = slugify(name, { lower: true, strict: true });
    const existing = await prisma.profession.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const profession = await prisma.profession.create({
      data: {
        slug,
        name: name.trim(),
        description: description.trim(),
        icon: icon.trim(),
        color: color ?? "orange",
        courseKeywords: courseKeywords ?? [],
        isDefault: false,
        order: order ?? 99,
      },
    });

    return NextResponse.json({ profession }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/professions]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
