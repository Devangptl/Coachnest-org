/**
 * GET  /api/professions — list all active professions (public)
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const professions = await prisma.profession.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        icon: true,
        color: true,
        courseKeywords: true,
        isDefault: true,
      },
    });

    return NextResponse.json({ professions });
  } catch (error) {
    console.error("[GET /api/professions]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
