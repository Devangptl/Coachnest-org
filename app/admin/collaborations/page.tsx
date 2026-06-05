/**
 * Admin → Collaborations.
 * Surface-level view of every course that has at least one collaborator,
 * with quick links into the course and a payout summary per collaborator.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ROLE_BADGE: Record<string, string> = {
  OWNER:         "badge-orange",
  CO_INSTRUCTOR: "badge-amber",
  EDITOR:        "badge-purple",
  VIEWER:        "badge bg-secondary text-muted-foreground border border-border",
};

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default async function AdminCollaborationsPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const courses = await prisma.course.findMany({
    where: { collaborators: { some: {} } },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      instructorRevenuePercent: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true, email: true, avatar: true } },
      collaborators: {
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } },
        },
      },
      _count: { select: { enrollments: true, lessons: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Aggregate per-collaborator earnings from wallet transactions tied to this course's orders.
  const courseIds = courses.map((c) => c.id);
  const txAgg = courseIds.length
    ? await prisma.walletTransaction.groupBy({
        by: ["walletId"],
        where: {
          order: { courseId: { in: courseIds } },
          type:  "CREDIT",
        },
        _sum: { amount: true },
      })
    : [];
  const walletTotals = new Map(
    txAgg.map((t) => [t.walletId, Number(t._sum.amount ?? 0)]),
  );

  const wallets = await prisma.instructorWallet.findMany({
    where: { id: { in: txAgg.map((t) => t.walletId) } },
    select: { id: true, userId: true, balance: true, totalEarned: true },
  });
  const walletByUser = new Map(wallets.map((w) => [w.userId, w]));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Course Collaborations</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Courses with more than one instructor — owners, revenue splits, and payouts.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          <Users className="w-4 h-4 inline mr-1.5 align-text-bottom" />
          {courses.length} collaborative course{courses.length === 1 ? "" : "s"}
        </div>
      </header>

      {courses.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No collaborative courses yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => {
            const ownerWallet = walletByUser.get(course.createdBy.id);
            const ownerEarned = ownerWallet ? Number(ownerWallet.totalEarned) : 0;
            return (
              <div key={course.id} className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="flex items-start justify-between gap-4 p-5 border-b border-border">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/courses/${course.id}`}
                        className="text-foreground font-semibold truncate hover:text-primary inline-flex items-center gap-1.5"
                      >
                        {course.title}
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                      <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                        {course.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Owner: <span className="text-foreground">{course.createdBy.name}</span> ·
                      {" "}{course._count.enrollments} enrollments ·
                      {" "}{course._count.lessons} lessons ·
                      {" "}{course.instructorRevenuePercent}% instructor share
                    </p>
                  </div>
                  <Link
                    href={`/admin/courses/${course.id}/edit`}
                    className="text-xs text-primary hover:text-primary/80 whitespace-nowrap"
                  >
                    Manage →
                  </Link>
                </div>

                <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-muted-foreground bg-secondary/40">
                      <th className="text-left font-medium px-5 py-2">Collaborator</th>
                      <th className="text-left font-medium px-5 py-2">Role</th>
                      <th className="text-right font-medium px-5 py-2">Revenue Share</th>
                      <th className="text-right font-medium px-5 py-2">Total Earned</th>
                      <th className="text-right font-medium px-5 py-2">Wallet Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-border">
                      <td className="px-5 py-3">
                        <div className="text-foreground font-medium">{course.createdBy.name}</div>
                        <div className="text-xs text-muted-foreground">{course.createdBy.email}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={ROLE_BADGE.OWNER}>Owner</span>
                      </td>
                      <td className="px-5 py-3 text-right text-foreground">
                        {100 - course.collaborators.reduce((s, c) => s + Number(c.revenueShare), 0)}%
                      </td>
                      <td className="px-5 py-3 text-right text-foreground">{inr(ownerEarned)}</td>
                      <td className="px-5 py-3 text-right text-foreground">
                        {inr(ownerWallet ? Number(ownerWallet.balance) : 0)}
                      </td>
                    </tr>
                    {course.collaborators.map((c) => {
                      const w = walletByUser.get(c.userId);
                      return (
                        <tr key={c.id} className="border-t border-border">
                          <td className="px-5 py-3">
                            <div className="text-foreground font-medium">{c.user.name}</div>
                            <div className="text-xs text-muted-foreground">{c.user.email}</div>
                          </td>
                          <td className="px-5 py-3">
                            <span className={ROLE_BADGE[c.role] ?? ROLE_BADGE.VIEWER}>
                              {c.role.replace(/_/g, " ")}
                            </span>
                            {!c.acceptedAt && (
                              <span className="badge-amber ml-2">Pending</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right text-foreground">
                            {Number(c.revenueShare)}%
                          </td>
                          <td className="px-5 py-3 text-right text-foreground">
                            {inr(w ? Number(w.totalEarned) : 0)}
                          </td>
                          <td className="px-5 py-3 text-right text-foreground">
                            {inr(w ? Number(w.balance) : 0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
