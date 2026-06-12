import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProfileForm from "@/app/dashboard/profile/ProfileForm";
import PasswordForm from "@/app/dashboard/profile/PasswordForm";
import InstructorAccountInfo from "./InstructorAccountInfo";
import ProfileStatusAlert from "./ProfileStatusAlert";

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
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Profile & Settings</h1>
        <p className="text-muted-foreground/70 text-sm mt-1">
          Manage your instructor account details and preferences
        </p>
      </div>

      <div className="flex flex-col lg:flex-row-reverse lg:items-start gap-5 sm:gap-6">
        {/* Sidebar — AccountInfo (top on mobile, right on desktop) */}
        <div className="lg:w-72 lg:shrink-0 space-y-5 lg:sticky lg:top-24">
          <InstructorAccountInfo
            email={user.email}
            createdAt={user.createdAt.toISOString()}
            stats={{
              courses: user._count.courses,
              students: totalStudents,
              totalEarned: Number(user.instructorWallet?.totalEarned ?? 0),
            }}
          />
        </div>

        {/* Main forms */}
        <div className="flex-1 min-w-0 space-y-5 sm:space-y-6">
          <ProfileStatusAlert
            status={user.instructorStatus ?? null}
            rejectReason={user.instructorRejectReason ?? null}
            userId={user.id}
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
    </div>
  );
}
