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
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Profile & Settings</h1>
        <p className="text-muted-foreground/70 text-sm mt-1">
          Manage your instructor account details and preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Status alert — APPROVED shown once (dismissible), PENDING/REJECTED always visible */}
        <ProfileStatusAlert
          status={user.instructorStatus ?? null}
          rejectReason={user.instructorRejectReason ?? null}
          userId={user.id}
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
