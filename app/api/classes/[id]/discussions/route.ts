import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { assertIsMember, createDiscussion } from "@/services/class.service";
import { discussionSchema } from "@/lib/validation/class";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await assertIsMember(id, session.userId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const kind = sp.get("kind") || undefined; // GENERAL / QUESTION / ANNOUNCEMENT_REPLY
  const filter = sp.get("filter") || undefined; // unanswered | mine | resolved
  const sort = sp.get("sort") || "recent"; // recent | top | replies
  const tag = sp.get("tag") || undefined;

  type Where = NonNullable<Parameters<typeof prisma.discussion.findMany>[0]>["where"];
  const where: Where = { classId: id, parentId: null };
  if (kind === "GENERAL" || kind === "QUESTION" || kind === "ANNOUNCEMENT_REPLY") {
    where.kind = kind;
  }
  if (filter === "unanswered") {
    where.kind = "QUESTION";
    where.resolved = false;
  } else if (filter === "resolved") {
    where.resolved = true;
  } else if (filter === "mine") {
    where.authorId = session.userId;
  }
  if (tag) where.tags = { has: tag };

  // Pinned always float; then chosen sort.
  const items = await prisma.discussion.findMany({
    where,
    orderBy: [
      { pinned: "desc" },
      sort === "replies"
        ? { replies: { _count: "desc" } }
        : sort === "top"
        ? { votes: { _count: "desc" } }
        : { createdAt: "desc" },
    ],
    include: {
      author: { select: { id: true, name: true, avatar: true } },
      votes: { select: { userId: true } },
      _count: { select: { replies: true, votes: true } },
    },
  });

  // Strip votes array but keep "myVote" flag + count for the client.
  const shaped = items.map((d) => {
    const { votes, ...rest } = d;
    return {
      ...rest,
      voteCount: d._count.votes,
      myVote: votes.some((v) => v.userId === session.userId),
    };
  });

  return NextResponse.json({ discussions: shaped });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = discussionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const d = await createDiscussion(id, session.userId, parsed.data);
    return NextResponse.json({ discussion: d }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 403 });
  }
}
