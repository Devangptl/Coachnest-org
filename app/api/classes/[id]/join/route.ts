import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { joinClass } from "@/services/class.service";
import { joinClassSchema } from "@/lib/validation/class";
import { prisma } from "@/lib/prisma";
import { sendNewClassJoinRequestEmail } from "@/lib/email";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = joinClassSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const enrollment = await joinClass(session.userId, id, parsed.data.inviteCode);

    // When approval is required, notify the instructor (fire-and-forget)
    if (enrollment.status === "PENDING") {
      prisma.class.findUnique({
        where: { id },
        include: { instructor: { select: { email: true, name: true } } },
      }).then(async (cls) => {
        if (!cls?.instructor.email) return;
        const student = await prisma.user.findUnique({
          where: { id: session.userId },
          select: { name: true },
        });
        sendNewClassJoinRequestEmail(
          cls.instructor.email,
          cls.instructor.name ?? "Instructor",
          student?.name ?? "A student",
          cls.title,
          id,
        ).catch(() => null);
      }).catch(() => null);
    }

    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
