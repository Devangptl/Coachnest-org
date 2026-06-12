/**
 * Admin → Instructor Detail
 * Profile, wallet, courses, payouts, and recent wallet transactions.
 */
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Mail, Globe, Wallet, BookOpen, Users, Star, Clock } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getInstructorDetails } from "@/services/instructor.service";
import GlassCard from "@/components/GlassCard";
import Avatar from "@/components/Avatar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function money(n: number, currency = "INR") {
  const symbol = currency === "INR" ? "₹" : currency + " ";
  return `${symbol}${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function payoutBadgeVariant(status: string) {
  switch (status) {
    case "PROCESSED": return "green";
    case "PENDING":   return "amber";
    case "REJECTED":  return "red";
    default:          return "gray";
  }
}

export default async function InstructorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const { id } = await params;
  const instructor = await getInstructorDetails(id);
  if (!instructor) notFound();

  const { wallet, courses, payoutRequests, recentTransactions, stats } = instructor;

  return (
    <div>
      <Link
        href="/admin/instructors"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Instructors
      </Link>

      {/* Profile header */}
      <GlassCard className="mb-6">
        <div className="flex flex-wrap items-start gap-6 justify-between">
          <div className="flex items-start gap-4">
            <Avatar
              name={instructor.name}
              avatar={instructor.avatar}
              seed={instructor.id}
              size="w-16 h-16"
              className="flex-shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-foreground">{instructor.name}</h1>
                <Badge variant="purple">INSTRUCTOR</Badge>
              </div>
              {instructor.headline && (
                <p className="text-muted-foreground text-sm mb-2">{instructor.headline}</p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground/80">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> {instructor.email}
                </span>
                {instructor.website && (
                  <a
                    href={instructor.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-foreground"
                  >
                    <Globe className="w-3.5 h-3.5" /> {instructor.website}
                  </a>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Joined {formatDate(instructor.createdAt)}
                </span>
              </div>
            </div>
          </div>

          <Link href={`/admin/instructors/${instructor.id}/edit`}>
            <Button variant="secondary">
              <Pencil className="w-4 h-4" /> Edit Profile
            </Button>
          </Link>
        </div>

        {instructor.bio && (
          <p className="mt-4 text-sm text-muted-foreground whitespace-pre-line">
            {instructor.bio}
          </p>
        )}
      </GlassCard>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        {[
          { label: "Courses",        value: stats.coursesCount.toString(),      icon: BookOpen, color: "text-blue-400" },
          { label: "Students",       value: stats.studentsCount.toString(),     icon: Users,    color: "text-emerald-400" },
          { label: "Avg Rating",     value: stats.averageRating ? stats.averageRating.toFixed(1) : "—", icon: Star, color: "text-yellow-400" },
          { label: "Reviews",        value: stats.reviewsCount.toString(),      icon: Star,     color: "text-[#d97757]" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <GlassCard key={stat.label} className="flex flex-col items-center text-center gap-2 sm:flex-row sm:text-left sm:gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                <Icon className={`w-5 h-5 md:w-6 md:h-6 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <div className="text-xl md:text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-muted-foreground text-[10px] sm:text-xs md:text-sm leading-tight">{stat.label}</div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Wallet */}
      <GlassCard className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="w-5 h-5 text-[#d97757]" />
          <h2 className="text-lg font-semibold text-foreground">Wallet</h2>
        </div>
        {wallet ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              { label: "Balance",       value: money(wallet.balance),         color: "text-[#d97757]"  },
              { label: "Total Earned",  value: money(wallet.totalEarned),     color: "text-foreground" },
              { label: "Withdrawn",     value: money(wallet.totalWithdrawn),  color: "text-foreground" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-secondary/30 border border-border rounded-lg px-4 py-3 sm:py-4">
                <div className="text-muted-foreground/70 text-[10px] sm:text-xs uppercase tracking-wider mb-1">
                  {label}
                </div>
                <div className={`text-lg sm:text-xl font-bold ${color}`}>{value}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No wallet yet.</p>
        )}
      </GlassCard>

      {/* Courses */}
      <GlassCard padding="sm" className="mb-6">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-foreground font-semibold">Courses</h2>
          <span className="text-muted-foreground/70 text-sm">{courses.length} total</span>
        </div>
        {courses.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            This instructor has not created any courses yet.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {courses.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-secondary transition-colors"
              >
                <div className="col-span-5 min-w-0">
                  <Link
                    href={`/admin/courses/${c.id}`}
                    className="text-foreground text-sm font-medium hover:text-[#d97757] truncate block"
                  >
                    {c.title}
                  </Link>
                  <div className="text-muted-foreground/70 text-xs">
                    {c.lessons} lesson{c.lessons === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="col-span-2 text-center">
                  <Badge
                    variant={
                      c.status === "PUBLISHED"
                        ? "green"
                        : c.status === "PENDING_REVIEW"
                        ? "amber"
                        : "gray"
                    }
                  >
                    {c.status}
                  </Badge>
                </div>
                <div className="col-span-2 text-center text-sm text-muted-foreground">
                  {c.enrollments} enrolled
                </div>
                <div className="col-span-2 text-right text-sm font-semibold text-foreground">
                  {money(c.price)}
                </div>
                <div className="col-span-1 text-right text-muted-foreground/70 text-xs">
                  {formatDate(c.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payout requests */}
        <GlassCard padding="sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-foreground font-semibold">Recent Payouts</h2>
            <Link
              href="/admin/payouts"
              className="text-muted-foreground/70 text-xs hover:text-foreground"
            >
              View all
            </Link>
          </div>
          {payoutRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No payout requests yet.
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {payoutRequests.map((p) => (
                <div
                  key={p.id}
                  className="grid grid-cols-12 gap-3 px-4 py-3 items-center text-sm"
                >
                  <div className="col-span-4 text-foreground font-medium">
                    {money(p.amount, p.currency)}
                  </div>
                  <div className="col-span-4 text-center">
                    <Badge variant={payoutBadgeVariant(p.status)}>{p.status}</Badge>
                  </div>
                  <div className="col-span-4 text-right text-muted-foreground/70 text-xs">
                    {formatDate(p.requestedAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Recent transactions */}
        <GlassCard padding="sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-foreground font-semibold">Recent Wallet Activity</h2>
          </div>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No wallet activity yet.
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {recentTransactions.map((t) => (
                <div
                  key={t.id}
                  className="grid grid-cols-12 gap-3 px-4 py-3 items-center text-sm"
                >
                  <div className="col-span-7 text-foreground text-xs truncate">
                    <div className="font-medium truncate">{t.description}</div>
                    <div className="text-muted-foreground/70">
                      {formatDate(t.createdAt)} · {t.type}
                    </div>
                  </div>
                  <div
                    className={`col-span-5 text-right font-semibold ${
                      t.type === "CREDIT" ? "text-emerald-400" : "text-muted-foreground"
                    }`}
                  >
                    {t.type === "CREDIT" ? "+" : "−"}
                    {money(Math.abs(t.amount))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
