/**
 * Instructor service — queries and mutations for admin-side instructor management.
 *
 * Instructors are Users with role = "INSTRUCTOR". Related revenue tables:
 *   • InstructorWallet (balance, totalEarned, totalWithdrawn)
 *   • PayoutRequest    (status, amount, bankDetails)
 *   • WalletTransaction
 *
 * All functions return plain, serializable objects safe to pass to Client Components.
 */
import { prisma } from "@/lib/prisma";

export type InstructorListFilter = {
  search?: string;
  sort?: "newest" | "oldest" | "name" | "earnings" | "courses";
};

export async function getInstructorsList(filter: InstructorListFilter = {}) {
  const { search = "", sort = "newest" } = filter;

  const where: any = { role: "INSTRUCTOR" as const };
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

  const instructors = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      headline: true,
      bio: true,
      website: true,
      createdAt: true,
      instructorWallet: {
        select: {
          balance: true,
          totalEarned: true,
          totalWithdrawn: true,
        },
      },
      _count: {
        select: {
          courses: true,
          payoutRequests: true,
        },
      },
    },
    orderBy,
  });

  // Count active students (distinct users enrolled across all courses by instructor)
  const rows = await Promise.all(
    instructors.map(async (i) => {
      const enrollments = await prisma.enrollment.findMany({
        where: { course: { createdById: i.id } },
        select: { userId: true },
      });
      const uniqueStudents = new Set(enrollments.map((e) => e.userId)).size;

      return {
        id: i.id,
        name: i.name,
        email: i.email,
        avatar: i.avatar,
        headline: i.headline,
        bio: i.bio,
        website: i.website,
        createdAt: i.createdAt.toISOString(),
        balance: Number(i.instructorWallet?.balance ?? 0),
        totalEarned: Number(i.instructorWallet?.totalEarned ?? 0),
        totalWithdrawn: Number(i.instructorWallet?.totalWithdrawn ?? 0),
        coursesCount: i._count.courses,
        payoutRequestsCount: i._count.payoutRequests,
        studentsCount: uniqueStudents,
      };
    })
  );

  // Optional sorts that need aggregated fields
  if (sort === "earnings") rows.sort((a, b) => b.totalEarned - a.totalEarned);
  if (sort === "courses")  rows.sort((a, b) => b.coursesCount - a.coursesCount);

  return rows;
}

export async function getInstructorStats() {
  const [total, withWallet, walletAgg, pendingPayouts] = await Promise.all([
    prisma.user.count({ where: { role: "INSTRUCTOR" } }),
    prisma.user.count({
      where: { role: "INSTRUCTOR", instructorWallet: { isNot: null } },
    }),
    prisma.instructorWallet.aggregate({
      _sum: { balance: true, totalEarned: true, totalWithdrawn: true },
    }),
    prisma.payoutRequest.count({ where: { status: "PENDING" } }),
  ]);

  return {
    total,
    withWallet,
    totalEarned: Number(walletAgg._sum.totalEarned ?? 0),
    totalBalance: Number(walletAgg._sum.balance ?? 0),
    totalWithdrawn: Number(walletAgg._sum.totalWithdrawn ?? 0),
    pendingPayouts,
  };
}

export async function getInstructorDetails(id: string) {
  const instructor = await prisma.user.findFirst({
    where: { id, role: "INSTRUCTOR" },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      bio: true,
      headline: true,
      website: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      instructorWallet: {
        select: {
          id: true,
          balance: true,
          totalEarned: true,
          totalWithdrawn: true,
          updatedAt: true,
        },
      },
      courses: {
        select: {
          id: true,
          title: true,
          slug: true,
          thumbnail: true,
          price: true,
          status: true,
          createdAt: true,
          _count: { select: { enrollments: true, reviews: true, lessons: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      payoutRequests: {
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          notes: true,
          adminNotes: true,
          requestedAt: true,
          processedAt: true,
        },
        orderBy: { requestedAt: "desc" },
        take: 20,
      },
    },
  });

  if (!instructor) return null;

  const [enrollments, reviewsAgg, latestTx] = await Promise.all([
    prisma.enrollment.findMany({
      where: { course: { createdById: id } },
      select: { userId: true },
    }),
    prisma.review.aggregate({
      where: { course: { createdById: id } },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    instructor.instructorWallet
      ? prisma.walletTransaction.findMany({
          where: { walletId: instructor.instructorWallet.id },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            amount: true,
            type: true,
            description: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const uniqueStudents = new Set(enrollments.map((e) => e.userId)).size;

  return {
    id: instructor.id,
    name: instructor.name,
    email: instructor.email,
    avatar: instructor.avatar,
    bio: instructor.bio,
    headline: instructor.headline,
    website: instructor.website,
    role: instructor.role,
    createdAt: instructor.createdAt.toISOString(),
    updatedAt: instructor.updatedAt.toISOString(),
    wallet: instructor.instructorWallet
      ? {
          id: instructor.instructorWallet.id,
          balance: Number(instructor.instructorWallet.balance),
          totalEarned: Number(instructor.instructorWallet.totalEarned),
          totalWithdrawn: Number(instructor.instructorWallet.totalWithdrawn),
          updatedAt: instructor.instructorWallet.updatedAt.toISOString(),
        }
      : null,
    courses: instructor.courses.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      thumbnail: c.thumbnail,
      price: Number(c.price),
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      enrollments: c._count.enrollments,
      reviews: c._count.reviews,
      lessons: c._count.lessons,
    })),
    payoutRequests: instructor.payoutRequests.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      currency: p.currency,
      status: p.status,
      notes: p.notes,
      adminNotes: p.adminNotes,
      requestedAt: p.requestedAt.toISOString(),
      processedAt: p.processedAt?.toISOString() ?? null,
    })),
    recentTransactions: latestTx.map((t) => ({
      id: t.id,
      amount: Number(t.amount),
      type: t.type,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    })),
    stats: {
      studentsCount: uniqueStudents,
      coursesCount: instructor.courses.length,
      publishedCourses: instructor.courses.filter((c) => c.status === "PUBLISHED").length,
      averageRating: reviewsAgg._avg.rating ? Number(reviewsAgg._avg.rating.toFixed(2)) : 0,
      reviewsCount: reviewsAgg._count.rating,
    },
  };
}

export type InstructorUpdate = {
  name?: string;
  headline?: string | null;
  bio?: string | null;
  website?: string | null;
  avatar?: string | null;
};

export async function updateInstructorProfile(id: string, data: InstructorUpdate) {
  const update: any = {};
  if (data.name !== undefined)     update.name = data.name;
  if (data.headline !== undefined) update.headline = data.headline;
  if (data.bio !== undefined)      update.bio = data.bio;
  if (data.website !== undefined)  update.website = data.website;
  if (data.avatar !== undefined)   update.avatar = data.avatar;

  return prisma.user.update({
    where: { id },
    data: update,
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      headline: true,
      bio: true,
      website: true,
      role: true,
    },
  });
}
