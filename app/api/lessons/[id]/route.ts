/**
 * PATCH  /api/lessons/:id  — update a lesson (admin only)
 * DELETE /api/lessons/:id  — delete a lesson (admin only)
 */
import { NextRequest, NextResponse } from "next/server";
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
    const data = await req.json();

    const lesson = await prisma.lesson.update({
      where: { id },
      data: {
        title: data.title,
        type: data.type,
        content: data.content,
        description: data.description,
        order: data.order,
        duration: data.duration,
        isFree: data.isFree,
      },
    });

    return NextResponse.json({ lesson });
  } catch (error) {
    console.error("[PATCH /api/lessons/:id]", error);
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
    await prisma.lesson.delete({ where: { id } });

    return NextResponse.json({ message: "Lesson deleted." });
  } catch (error) {
    console.error("[DELETE /api/lessons/:id]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
