import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Clock, XCircle, Mail, LogOut, BookOpen, Users, TrendingUp } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import Avatar from "@/components/Avatar";

export default async function InstructorPendingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "STUDENT") redirect("/dashboard");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      name: true,
      email: true,
      avatar: true,
      headline: true,
      bio: true,
      instructorStatus: true,
      instructorAppliedAt: true,
      instructorReviewedAt: true,
      instructorRejectReason: true,
    },
  });

  // Approved instructors should not be on this page
  if (!user || user.instructorStatus === "APPROVED") redirect("/instructor");

  const isRejected = user.instructorStatus === "REJECTED";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl space-y-6 animate-fade-in">

        {/* Status Alert */}
        {isRejected ? (
          <div className="flex items-start gap-4 bg-red-500/10 border border-red-500/25 rounded-xl px-6 py-5">
            <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-semibold text-base">Application Not Approved</p>
              <p className="text-red-400/70 text-sm mt-1">
                Your instructor application was reviewed and could not be approved at this time.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-4 bg-amber-500/10 border border-amber-500/25 rounded-xl px-6 py-5">
            <Clock className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="text-amber-400 font-semibold text-base">Application Under Review</p>
              <p className="text-amber-400/70 text-sm mt-1">
                Your application has been submitted and is awaiting admin approval. We&apos;ll notify you by email.
              </p>
            </div>
          </div>
        )}

        {/* Profile Card */}
        <GlassCard className="flex items-center gap-5">
          <Avatar
            name={user.name}
            avatar={user.avatar}
            seed={session.userId}
            size="w-16 h-16"
            className="flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-foreground truncate">{user.name}</h2>
            {user.headline && (
              <p className="text-muted-foreground text-sm truncate">{user.headline}</p>
            )}
            <p className="text-muted-foreground/60 text-xs mt-1 flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {user.email}
            </p>
          </div>
          <span className={`flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${
            isRejected
              ? "bg-red-500/10 border-red-500/25 text-red-400"
              : "bg-amber-500/10 border-amber-500/25 text-amber-400"
          }`}>
            {isRejected ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {isRejected ? "Rejected" : "Pending Approval"}
          </span>
        </GlassCard>

        {/* Main Content */}
        <GlassCard className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isRejected ? "Application Status" : "Awaiting Approval"}
            </h1>
            <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
              {isRejected
                ? "Thank you for your interest in teaching on CoachNest. Unfortunately, your application was not approved at this time."
                : "Thank you for applying to become an instructor on CoachNest! Our team is reviewing your application and will get back to you within 1–2 business days."}
            </p>
          </div>

          {/* Timeline */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Application Timeline</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-foreground font-medium">Application submitted</p>
                  {user.instructorAppliedAt && (
                    <p className="text-xs text-muted-foreground/60">
                      {new Date(user.instructorAppliedAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                    </p>
                  )}
                </div>
                <span className="text-xs text-emerald-400 font-semibold">Done</span>
              </div>
              <div className="ml-[4px] w-px h-4 bg-border" />
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  isRejected ? "bg-red-400" : "bg-amber-400 animate-pulse"
                }`} />
                <div className="flex-1">
                  <p className="text-sm text-foreground font-medium">Admin review</p>
                  {user.instructorReviewedAt ? (
                    <p className="text-xs text-muted-foreground/60">
                      {new Date(user.instructorReviewedAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground/60">In progress…</p>
                  )}
                </div>
                <span className={`text-xs font-semibold ${
                  isRejected ? "text-red-400" : "text-amber-400"
                }`}>
                  {isRejected ? "Rejected" : "Pending"}
                </span>
              </div>
              {!isRejected && (
                <>
                  <div className="ml-[4px] w-px h-4 bg-border" />
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/20 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground font-medium">Access granted</p>
                      <p className="text-xs text-muted-foreground/60">After approval</p>
                    </div>
                    <span className="text-xs text-muted-foreground/50 font-semibold">Waiting</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Rejection reason */}
          {isRejected && user.instructorRejectReason && (
            <div className="bg-red-500/5 border border-red-500/15 rounded-lg px-4 py-3">
              <p className="text-xs font-semibold text-red-400/70 uppercase tracking-wider mb-1.5">Reason provided</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{user.instructorRejectReason}</p>
            </div>
          )}

          {/* What happens next */}
          {!isRejected && (
            <div className="bg-secondary/50 rounded-lg px-4 py-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What happens next</p>
              <ul className="space-y-1.5">
                {[
                  "Our team reviews your application",
                  "You receive an email notification with the decision",
                  "Once approved, you can log in and start creating courses",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-orange-500 font-bold mt-px">{String(i + 1).padStart(2, "0")}</span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-1">
            {isRejected ? (
              <Link href="/contact" className="btn-primary flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4" />
                Contact Support
              </Link>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/25 rounded-lg text-amber-400 text-sm font-medium">
                <Clock className="w-4 h-4 animate-pulse" />
                Awaiting approval
              </div>
            )}
            <Link
              href="/api/auth/logout"
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Link>
          </div>
        </GlassCard>

        {/* Browse as student */}
        <GlassCard>
          <p className="text-sm font-semibold text-foreground mb-4">While you wait, explore our course catalog</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: BookOpen,   label: "Browse Courses",  href: "/courses",    color: "text-blue-400",    bg: "bg-blue-500/10" },
              { icon: Users,      label: "Community",       href: "/community",  color: "text-purple-400",  bg: "bg-purple-500/10" },
              { icon: TrendingUp, label: "Learning Paths",  href: "/courses",    color: "text-emerald-400", bg: "bg-emerald-500/10" },
            ].map(({ icon: Icon, label, href, color, bg }) => (
              <Link
                key={label}
                href={href}
                className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:border-border/80 hover:bg-secondary/50 transition-colors text-center"
              >
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <span className="text-xs text-muted-foreground font-medium leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </GlassCard>

      </div>
    </div>
  );
}
