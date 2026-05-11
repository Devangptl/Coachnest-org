import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProfileForm from "@/app/dashboard/profile/ProfileForm";
import PasswordForm from "@/app/dashboard/profile/PasswordForm";
import InstructorAccountInfo from "./InstructorAccountInfo";
import { CheckCircle2, Clock, XCircle, AlertTriangle } from "lucide-react";

async function getInstructorProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      bio: true,
      headline: true,
      website: true,
      createdAt: true,
      instructorStatus: true,
      instructorAppliedAt: true,
      instructorReviewedAt: true,
      instructorRejectReason: true,
      _count: {
        select: { courses: true },
      },
      courses: {
        select: {
          _count: { select: { enrollments: true } },
        },
      },
      instructorWallet: {
        select: { totalEarned: true },
      },
    },
  });
}

function StatusAlert({ status, rejectReason }: {
  status: string | null;
  rejectReason: string | null;
}) {
  if (status === "APPROVED") {
    return (
      <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-5 py-4">
        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-emerald-400 font-semibold text-sm">Account Active</p>
          <p className="text-emerald-400/70 text-xs mt-0.5">
            Your instructor account is approved and active. You can create and publish courses.
          </p>
        </div>
      </div>
    );
  }
  if (status === "PENDING") {
    return (
      <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-5 py-4">
        <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5 animate-pulse" />
        <div>
          <p className="text-amber-400 font-semibold text-sm">Pending Approval</p>
          <p className="text-amber-400/70 text-xs mt-0.5">
            Your application is under review. You&apos;ll receive an email notification once a decision is made.
          </p>
        </div>
      </div>
    );
  }
  if (status === "REJECTED") {
    return (
      <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/25 rounded-xl px-5 py-4">
        <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-red-400 font-semibold text-sm">Application Not Approved</p>
          {rejectReason && (
            <p className="text-red-400/70 text-xs mt-0.5">Reason: {rejectReason}</p>
          )}
          <p className="text-red-400/60 text-xs mt-1">
            Contact <a href="/contact" className="underline">support</a> if you have questions.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 bg-secondary border border-border rounded-xl px-5 py-4">
      <AlertTriangle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
      <p className="text-muted-foreground text-sm">Account status unknown. Contact support.</p>
    </div>
  );
}

export default async function InstructorProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "STUDENT") redirect("/dashboard");

  const user = await getInstructorProfile(session.userId);
  if (!user) redirect("/login");

  const totalStudents = user.courses.reduce(
    (sum: number, course) => sum + course._count.enrollments,
    0
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Profile & Settings</h1>
        <p className="text-muted-foreground/70 text-sm mt-1">
          Manage your instructor account details and preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Status alert */}
        <StatusAlert
          status={user.instructorStatus ?? null}
          rejectReason={user.instructorRejectReason ?? null}
        />

        <InstructorAccountInfo
          email={user.email}
          createdAt={user.createdAt.toISOString()}
          stats={{
            courses: user._count.courses,
            students: totalStudents,
            totalEarned: Number(user.instructorWallet?.totalEarned ?? 0),
          }}
        />

        <ProfileForm
          initialData={{
            name: user.name,
            bio: user.bio ?? "",
            headline: user.headline ?? "",
            website: user.website ?? "",
            avatar: user.avatar ?? "",
          }}
        />

        <PasswordForm />
      </div>
    </div>
  );
}
