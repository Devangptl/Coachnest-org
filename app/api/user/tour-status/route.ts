import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, status } = await req.json();

    if (type !== "dashboard" && type !== "community") {
      return NextResponse.json({ error: "Invalid tour type" }, { status: 400 });
    }

    if (typeof status !== "boolean") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    if (type === "dashboard") {
      await prisma.user.update({
        where: { id: session.userId },
        data: { hasSeenTour: status } as any,
      });
    } else {
      await prisma.user.update({
        where: { id: session.userId },
        data: { hasSeenCommunityTour: status } as any,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tour status update error:", error);
    return NextResponse.json(
      { error: "Failed to update tour status" },
      { status: 500 }
    );
  }
}
