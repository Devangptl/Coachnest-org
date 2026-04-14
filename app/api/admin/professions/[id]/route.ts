/**
 * GET    /api/admin/professions/[id] — get single profession
 * PUT    /api/admin/professions/[id] — update profession
 * DELETE /api/admin/professions/[id] — delete profession
 */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;

  try {
    const profession = await prisma.profession.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!profession) return NextResponse.json({ error: "Not found." }, { status: 404 });

    return NextResponse.json({ profession });
  } catch (error) {
    console.error("[GET /api/admin/professions/:id]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;

  try {
    const { name, description, icon, color, courseKeywords, isActive, order } =
      await req.json();

    const profession = await prisma.profession.update({
      where: { id },
      data: {
        ...(name        !== undefined && { name:           name.trim()        }),
        ...(description !== undefined && { description:    description.trim() }),
        ...(icon        !== undefined && { icon:           icon.trim()        }),
        ...(color       !== undefined && { color                              }),
        ...(courseKeywords !== undefined && { courseKeywords                  }),
        ...(isActive    !== undefined && { isActive                           }),
        ...(order       !== undefined && { order                              }),
      },
    });

    return NextResponse.json({ profession });
  } catch (error) {
    console.error("[PUT /api/admin/professions/:id]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;

  try {
    await prisma.profession.delete({ where: { id } });
    return NextResponse.json({ message: "Profession deleted." });
  } catch (error) {
    console.error("[DELETE /api/admin/professions/:id]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
