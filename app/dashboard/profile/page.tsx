import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProfileForm from "./ProfileForm";
import PasswordForm from "./PasswordForm";
import AccountInfo from "./AccountInfo";
import ProfessionForm from "./ProfessionForm";

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
    <div className="pb-24 md:pb-6">
      <div className="mb-5 sm:mb-7">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Profile & Settings</h1>
        <p className="text-muted-foreground/70 text-sm mt-1">
          Manage your account details and preferences
        </p>
      </div>

      {/* Desktop: sidebar layout — AccountInfo right, forms left.
          Mobile: AccountInfo first (top), forms below. */}
      <div className="flex flex-col lg:flex-row-reverse lg:items-start gap-4 sm:gap-5 lg:gap-6">
        {/* Sidebar — AccountInfo (first in DOM → top on mobile, right on desktop) */}
        <div className="lg:w-72 lg:shrink-0 lg:sticky lg:top-24">
          <AccountInfo
            name={user.name}
            avatar={user.avatar ?? ""}
            email={user.email}
            createdAt={user.createdAt.toISOString()}
            stats={user._count}
          />
        </div>

        {/* Main forms */}
        <div className="flex-1 min-w-0 space-y-5 sm:space-y-6">
          <ProfileForm
            initialData={{
              name: user.name,
              bio: user.bio ?? "",
              headline: user.headline ?? "",
              website: user.website ?? "",
              avatar: user.avatar ?? "",
            }}
          />
          <ProfessionForm />
          <PasswordForm />
        </div>
      </div>
    </div>
  );
}
