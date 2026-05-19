/**
 * Student Service — paginated student listing and stats for the admin area.
 * Returns plain serializable objects (safe to pass to Client Components).
 */
import { prisma } from "@/lib/prisma";
import { getLevelForXp } from "@/lib/badges";
import { buildPaginated, parsePagination, type Paginated, type PaginationParams } from "@/lib/pagination";

export type StudentListFilter = {
  search?: string;
  sort?: "newest" | "oldest" | "name";
} & PaginationParams;

export async function getStudentsList(
  filter: StudentListFilter = {},
): Promise<Paginated<{
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  headline: string | null;
  createdAt: string;
  xp: number;
  level: number;
  levelLabel: string;
  streak: number;
  _count: { enrollments: number; certificates: number; orders: number; reviews: number };
}>> {
  const { search = "", sort = "newest" } = filter;
  const { page, pageSize, skip, take } = parsePagination(filter);

  const where: any = { role: "STUDENT" as const };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const orderBy: any =
    sort === "name"   ? { name: "asc" } :
    sort === "oldest" ? { createdAt: "asc" } :
    { createdAt: "desc" };

  const [students, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        headline: true,
        createdAt: true,
        gameProfile: { select: { xp: true, level: true, streak: true } },
        _count: {
          select: { enrollments: true, certificates: true, orders: true, reviews: true },
        },
      },
      orderBy,
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ]);

  const data = students.map((s) => {
    const xp = s.gameProfile?.xp ?? 0;
    const lvl = getLevelForXp(xp);
    return {
      id: s.id,
      name: s.name,
      email: s.email,
      avatar: s.avatar,
      headline: s.headline,
      createdAt: s.createdAt.toISOString(),
      xp,
      level: lvl.level,
      levelLabel: lvl.label,
      streak: s.gameProfile?.streak ?? 0,
      _count: s._count,
    };
  });

  return buildPaginated(data, total, page, pageSize);
}

export async function getStudentStats() {
  const activeThreshold = new Date();
  activeThreshold.setDate(activeThreshold.getDate() - 30);

  const [total, totalEnrollments, totalCertificates, activeStudents] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.enrollment.count(),
    prisma.certificate.count(),
    prisma.enrollment.groupBy({
      by: ["userId"],
      where: { enrolledAt: { gte: activeThreshold } },
    }),
  ]);

  return {
    total,
    active: activeStudents.length,
    totalEnrollments,
    totalCertificates,
  };
}
