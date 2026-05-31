/**
 * PATCH  /api/sections/:id — update title or order
 * DELETE /api/sections/:id — delete section (lessons become ungrouped)
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "INSTRUCTOR")) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    const { title, order } = await req.json();

    const section = await prisma.section.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(order !== undefined && { order }),
      },
    });

    revalidateTag("course-lessons", "max");

    return NextResponse.json({ section });
  } catch (error) {
    console.error("[PATCH /api/sections/:id]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "INSTRUCTOR")) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;

    // Unassign lessons — they become ungrouped (not deleted)
    await prisma.lesson.updateMany({
      where: { sectionId: id },
      data: { sectionId: null },
    });

    revalidateTag("course-lessons", "max");

    await prisma.section.delete({ where: { id } });

    return NextResponse.json({ message: "Chapter deleted." });
  } catch (error) {
    console.error("[DELETE /api/sections/:id]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
