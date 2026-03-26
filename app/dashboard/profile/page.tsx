/**
 * /dashboard/profile — Student profile & account settings.
 */
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProfileForm from "./ProfileForm";
import PasswordForm from "./PasswordForm";
import AccountInfo from "./AccountInfo";

async function getProfile(userId: string) {
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
      _count: {
        select: {
          enrollments: true,
          certificates: true,
          reviews: true,
        },
      },
    },
  });
}

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await getProfile(session.userId);
  if (!user) redirect("/login");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Profile & Settings</h1>
        <p className="text-white/40 text-sm mt-1">
          Manage your account details and preferences
        </p>
      </div>

      <div className="space-y-6">
        <AccountInfo
          email={user.email}
          createdAt={user.createdAt.toISOString()}
          stats={user._count}
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
