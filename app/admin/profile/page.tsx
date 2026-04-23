import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProfileForm from "@/app/dashboard/profile/ProfileForm";
import PasswordForm from "@/app/dashboard/profile/PasswordForm";
import AdminAccountInfo from "./AdminAccountInfo";

async function getAdminProfile(userId: string) {
  const [user, students, instructors, courses] = await Promise.all([
    prisma.user.findUnique({
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
      },
    }),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { role: "INSTRUCTOR" } }),
    prisma.course.count(),
  ]);

  return { user, stats: { students, instructors, courses } };
}

export default async function AdminProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/instructor");

  const { user, stats } = await getAdminProfile(session.userId);
  if (!user) redirect("/login");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Profile & Settings</h1>
        <p className="text-muted-foreground/70 text-sm mt-1">
          Manage your admin account details and preferences
        </p>
      </div>

      <div className="space-y-6">
        <AdminAccountInfo
          email={user.email}
          createdAt={user.createdAt.toISOString()}
          stats={stats}
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
