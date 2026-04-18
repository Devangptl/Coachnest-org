/**
 * POST /api/admin/students/[id]/send-notification — Send notification to a student
 */
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, message, type } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required." },
        { status: 400 }
      );
    }

    const student = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }

    const notification = await createNotification({
      data: {
        userId: id,
        title,
        body: message,
        type: type || "SYSTEM",
      },
    });

    return NextResponse.json({ data: notification }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/students/[id]/send-notification]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
