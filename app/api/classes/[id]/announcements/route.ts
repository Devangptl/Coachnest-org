import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { assertIsMember, createAnnouncement } from "@/services/class.service";
import { announcementSchema } from "@/lib/validation/class";
import { sendClassAnnouncementEmail } from "@/lib/email";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await assertIsMember(id, session.userId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await prisma.announcement.findMany({
    where: { classId: id },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    include: { author: { select: { id: true, name: true, avatar: true } } },
  });
  return NextResponse.json({ announcements: items });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = announcementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const a = await createAnnouncement(id, session.userId, parsed.data);

    // Email all approved class members about the announcement (fire-and-forget)
    prisma.class.findUnique({
      where: { id },
      select: { name: true },
    }).then(async (cls) => {
      if (!cls) return;
      const enrollments = await prisma.classEnrollment.findMany({
        where: { classId: id, status: "APPROVED", userId: { not: session.userId } },
        include: { user: { select: { email: true, name: true } } },
      });
      await Promise.allSettled(
        enrollments.map((e) =>
          e.user.email
            ? sendClassAnnouncementEmail(
                e.user.email,
                e.user.name ?? "Student",
                cls.name,
                a.title,
                a.body,
                id,
              )
            : Promise.resolve()
        )
      );
    }).catch(() => null);

    return NextResponse.json({ announcement: a }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
